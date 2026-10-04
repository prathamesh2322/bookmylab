package com.bookmylab.service

import com.bookmylab.dto.*
import com.bookmylab.exception.*
import com.bookmylab.model.*
import com.bookmylab.repository.*
import com.bookmylab.security.JwtService
import org.springframework.security.core.Authentication
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Duration
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.LocalTime
import java.time.format.DateTimeFormatter
import java.util.Locale

private val ACTIVE_STATUSES = listOf(BookingStatus.PENDING, BookingStatus.APPROVED)
private val TIME_FMT: DateTimeFormatter = DateTimeFormatter.ofPattern("hh:mm a", Locale.ENGLISH)

// ---------------------------------------------------------------- Auth
@Service
class AuthService(
    private val users: UserRepository,
    private val encoder: PasswordEncoder,
    private val jwt: JwtService
) {
    fun register(req: RegisterRequest): AuthResponse {
        val email = req.email!!.trim().lowercase()
        if (users.existsByEmail(email)) throw ConflictException("An account with this email already exists.")
        val user = users.save(User(name = req.name!!.trim(), email = email, password = encoder.encode(req.password!!), role = Role.STUDENT))
        return AuthResponse(jwt.generateToken(user), user.toDto())
    }

    fun login(req: LoginRequest): AuthResponse {
        val user = users.findByEmail(req.email!!.trim().lowercase())
        if (user == null || !encoder.matches(req.password!!, user.password)) {
            throw UnauthorizedException("Invalid email or password.")
        }
        return AuthResponse(jwt.generateToken(user), user.toDto())
    }

    fun currentUser(auth: Authentication): User =
        users.findByEmail(auth.name) ?: throw UnauthorizedException("User no longer exists. Please login again.")
}

// ---------------------------------------------------------------- Equipment
@Service
class EquipmentService(
    private val equipmentRepo: EquipmentRepository,
    private val bookingRepo: BookingRepository,
    private val maintenanceRepo: MaintenanceRepository
) {
    /** Units free right now = quantity - active bookings overlapping the current moment. */
    private fun availableNow(e: Equipment): Int {
        val now = LocalDateTime.now()
        val busy = bookingRepo.findOverlapping(
            e.id!!, now.toLocalDate(), now.toLocalTime(), now.toLocalTime().plusSeconds(1), listOf(BookingStatus.APPROVED)
        ).size
        return (e.quantity - busy).coerceAtLeast(0)
    }

    fun toResponse(e: Equipment): EquipmentResponse {
        val available = if (e.status == EquipmentStatus.AVAILABLE || e.status == EquipmentStatus.BOOKED) availableNow(e) else 0
        val effective = when (e.status) {
            EquipmentStatus.MAINTENANCE, EquipmentStatus.UNAVAILABLE -> e.status
            else -> if (available == 0) EquipmentStatus.BOOKED else EquipmentStatus.AVAILABLE
        }
        return EquipmentResponse(e.id!!, e.code, e.name, e.category, e.quantity, available, e.location, e.condition, e.description, effective)
    }

    @Transactional(readOnly = true)
    fun findAll(): List<EquipmentResponse> = equipmentRepo.findAll().sortedBy { it.name }.map { toResponse(it) }

    @Transactional(readOnly = true)
    fun findOne(id: Long): EquipmentResponse = toResponse(entity(id))

    fun entity(id: Long): Equipment = equipmentRepo.findById(id).orElseThrow { NotFoundException("Equipment #$id not found.") }

    @Transactional
    fun create(req: EquipmentRequest): EquipmentResponse {
        val code = req.code?.takeIf { it.isNotBlank() }?.trim()?.uppercase() ?: generateCode(req.name!!)
        if (equipmentRepo.existsByCode(code)) throw ConflictException("Equipment code $code already exists.")
        val saved = equipmentRepo.save(
            Equipment(
                code = code, name = req.name!!.trim(), category = req.category!!.trim(), quantity = req.quantity!!,
                location = req.location!!.trim(), condition = req.condition?.ifBlank { "Good" } ?: "Good",
                description = req.description ?: "", status = storedStatus(req.status)
            )
        )
        return toResponse(saved)
    }

    @Transactional
    fun update(id: Long, req: EquipmentRequest): EquipmentResponse {
        val e = entity(id)
        e.name = req.name!!.trim()
        e.category = req.category!!.trim()
        e.quantity = req.quantity!!
        e.location = req.location!!.trim()
        e.condition = req.condition?.ifBlank { "Good" } ?: e.condition
        e.description = req.description ?: e.description
        req.status?.let { e.status = storedStatus(it) }
        return toResponse(equipmentRepo.save(e))
    }

    @Transactional
    fun delete(id: Long) {
        val e = entity(id)
        bookingRepo.deleteByEquipmentId(id)
        maintenanceRepo.deleteByEquipmentId(id)
        equipmentRepo.delete(e)
    }

    @Transactional(readOnly = true)
    fun schedule(id: Long): List<ScheduleSlot> {
        entity(id)
        return bookingRepo
            .findByEquipmentIdAndDateGreaterThanEqualAndStatusInOrderByDateAscStartTimeAsc(id, LocalDate.now(), ACTIVE_STATUSES)
            .map { ScheduleSlot(it.date, it.startTime, it.endTime, it.status) }
    }

    // BOOKED is derived automatically, so it is stored as AVAILABLE.
    private fun storedStatus(s: EquipmentStatus?) = if (s == null || s == EquipmentStatus.BOOKED) EquipmentStatus.AVAILABLE else s

    private fun generateCode(name: String): String {
        val prefix = name.filter { it.isLetter() }.take(3).uppercase().padEnd(3, 'X')
        var n = 1
        while (equipmentRepo.existsByCode("%s-%03d".format(prefix, n))) n++
        return "%s-%03d".format(prefix, n)
    }
}

// ---------------------------------------------------------------- Booking
@Service
class BookingService(
    private val bookingRepo: BookingRepository,
    private val equipmentService: EquipmentService
) {
    private fun entity(id: Long): Booking = bookingRepo.findById(id).orElseThrow { NotFoundException("Booking #$id not found.") }

    @Transactional(readOnly = true)
    fun list(user: User): List<BookingResponse> {
        val rows = if (user.role == Role.ADMIN) bookingRepo.findAllByOrderByDateDescStartTimeDesc()
        else bookingRepo.findByUserIdOrderByDateDescStartTimeDesc(user.id!!)
        return rows.map { it.toResponse() }
    }

    @Transactional(readOnly = true)
    fun get(id: Long, user: User): BookingResponse = ownedOrAdmin(entity(id), user).toResponse()

    @Transactional
    fun create(user: User, req: BookingRequest): BookingResponse {
        val equipment = equipmentService.entity(req.equipmentId!!)
        validateSlot(equipment, req)
        assertNoConflict(equipment, req.date!!, req.startTime!!, req.endTime!!, user.id!!, excludeId = null)
        val saved = bookingRepo.save(
            Booking(user = user, equipment = equipment, date = req.date, startTime = req.startTime, endTime = req.endTime,
                purpose = req.purpose!!.trim(), status = BookingStatus.PENDING)
        )
        return saved.toResponse()
    }

    /** Booking owner (or admin) may edit a booking that is still PENDING. */
    @Transactional
    fun update(id: Long, user: User, req: BookingRequest): BookingResponse {
        val b = ownedOrAdmin(entity(id), user)
        if (b.status != BookingStatus.PENDING) throw BadRequestException("Only PENDING bookings can be edited.")
        val equipment = equipmentService.entity(req.equipmentId!!)
        validateSlot(equipment, req)
        assertNoConflict(equipment, req.date!!, req.startTime!!, req.endTime!!, b.user.id!!, excludeId = b.id)
        b.equipment = equipment
        b.date = req.date
        b.startTime = req.startTime
        b.endTime = req.endTime
        b.purpose = req.purpose!!.trim()
        return bookingRepo.save(b).toResponse()
    }

    /** Admin workflow: PENDING -> APPROVED/REJECTED, APPROVED -> COMPLETED/CANCELLED. */
    @Transactional
    fun changeStatus(id: Long, newStatus: BookingStatus): BookingResponse {
        val b = entity(id)
        val allowed = when (b.status) {
            BookingStatus.PENDING -> listOf(BookingStatus.APPROVED, BookingStatus.REJECTED, BookingStatus.CANCELLED)
            BookingStatus.APPROVED -> listOf(BookingStatus.COMPLETED, BookingStatus.CANCELLED)
            else -> emptyList()
        }
        if (newStatus !in allowed) throw BadRequestException("Cannot change a ${b.status} booking to $newStatus.")
        b.status = newStatus
        return bookingRepo.save(b).toResponse()
    }

    @Transactional
    fun cancel(id: Long, user: User): BookingResponse {
        val b = ownedOrAdmin(entity(id), user)
        if (b.status != BookingStatus.PENDING && b.status != BookingStatus.APPROVED)
            throw BadRequestException("A ${b.status} booking cannot be cancelled.")
        b.status = BookingStatus.CANCELLED
        return bookingRepo.save(b).toResponse()
    }

    @Transactional
    fun delete(id: Long, user: User) {
        val b = ownedOrAdmin(entity(id), user)
        if (user.role != Role.ADMIN && b.status == BookingStatus.APPROVED)
            throw BadRequestException("Cancel an approved booking instead of deleting it.")
        bookingRepo.delete(b)
    }

    private fun ownedOrAdmin(b: Booking, user: User): Booking {
        if (user.role != Role.ADMIN && b.user.id != user.id) throw ForbiddenException("This booking belongs to another student.")
        return b
    }

    private fun validateSlot(equipment: Equipment, req: BookingRequest) {
        if (!req.endTime!!.isAfter(req.startTime!!)) throw BadRequestException("End time must be after start time.")
        if (req.date!!.isBefore(LocalDate.now())) throw BadRequestException("You cannot book a date in the past.")
        if (req.date == LocalDate.now() && req.startTime.isBefore(LocalTime.now().minusMinutes(1)))
            throw BadRequestException("Start time has already passed today.")
        if (equipment.status == EquipmentStatus.MAINTENANCE) throw ConflictException("${equipment.name} is under maintenance and cannot be booked.")
        if (equipment.status == EquipmentStatus.UNAVAILABLE) throw ConflictException("${equipment.name} is currently unavailable.")
    }

    /**
     * THE BUSINESS RULE: no double booking.
     * Two time ranges overlap when existing.start < new.end AND existing.end > new.start.
     * A unit is "taken" by every PENDING/APPROVED booking in that range; if all units are taken, reject.
     */
    private fun assertNoConflict(e: Equipment, date: LocalDate, start: LocalTime, end: LocalTime, userId: Long, excludeId: Long?) {
        val overlapping = bookingRepo.findOverlapping(e.id!!, date, start, end, ACTIVE_STATUSES).filter { it.id != excludeId }
        overlapping.firstOrNull { it.user.id == userId }?.let {
            throw ConflictException("You already have a booking for ${e.name} from ${it.startTime.format(TIME_FMT)} to ${it.endTime.format(TIME_FMT)} on ${it.date}.")
        }
        if (overlapping.size >= e.quantity) {
            val first = overlapping.first()
            throw ConflictException(
                "Equipment unavailable: ${e.name} is already booked from ${first.startTime.format(TIME_FMT)} to ${first.endTime.format(TIME_FMT)} on ${first.date}."
            )
        }
    }
}

// ---------------------------------------------------------------- Maintenance
@Service
class MaintenanceService(
    private val maintenanceRepo: MaintenanceRepository,
    private val equipmentRepo: EquipmentRepository,
    private val equipmentService: EquipmentService
) {
    @Transactional(readOnly = true)
    fun list(): List<MaintenanceResponse> = maintenanceRepo.findAllByOrderByStartDateDescIdDesc().map { it.toResponse() }

    @Transactional
    fun create(req: MaintenanceRequest): MaintenanceResponse {
        val e = equipmentService.entity(req.equipmentId!!)
        if (req.endDate != null && req.endDate.isBefore(req.startDate!!)) throw BadRequestException("End date cannot be before start date.")
        e.status = EquipmentStatus.MAINTENANCE
        equipmentRepo.save(e)
        return maintenanceRepo.save(Maintenance(equipment = e, reason = req.reason!!.trim(), startDate = req.startDate!!, endDate = req.endDate)).toResponse()
    }

    /** Completing maintenance puts the equipment back into service. */
    @Transactional
    fun complete(id: Long): MaintenanceResponse {
        val m = maintenanceRepo.findById(id).orElseThrow { NotFoundException("Maintenance record #$id not found.") }
        if (m.status == MaintenanceStatus.COMPLETED) throw BadRequestException("Maintenance is already completed.")
        m.status = MaintenanceStatus.COMPLETED
        m.endDate = LocalDate.now()
        val stillOngoing = maintenanceRepo.findByEquipmentIdAndStatus(m.equipment.id!!, MaintenanceStatus.ONGOING).any { it.id != m.id }
        if (!stillOngoing) {
            m.equipment.status = EquipmentStatus.AVAILABLE
            equipmentRepo.save(m.equipment)
        }
        return maintenanceRepo.save(m).toResponse()
    }

    @Transactional
    fun delete(id: Long) {
        if (!maintenanceRepo.existsById(id)) throw NotFoundException("Maintenance record #$id not found.")
        maintenanceRepo.deleteById(id)
    }
}

// ---------------------------------------------------------------- Dashboard (Exp 6: map / filter / reduce)
@Service
class DashboardService(
    private val bookingRepo: BookingRepository,
    private val userRepo: UserRepository,
    private val equipmentService: EquipmentService
) {
    @Transactional(readOnly = true)
    fun admin(): AdminDashboard {
        val equipment = equipmentService.findAll()
        val bookings = bookingRepo.findAll()

        val equipmentByStatus = equipment.groupingBy { it.status }.eachCount()
        val bookingsByStatus = bookings.groupingBy { it.status }.eachCount()

        // filter -> map -> reduce
        val bookedMinutes = bookings
            .filter { it.status == BookingStatus.APPROVED || it.status == BookingStatus.COMPLETED }
            .map { Duration.between(it.startTime, it.endTime).toMinutes() }
            .reduceOrNull { total, minutes -> total + minutes } ?: 0L

        val top = bookings
            .groupBy { it.equipment.name }
            .map { (name, rows) -> NameCount(name, rows.size) }
            .sortedByDescending { it.count }
            .take(5)

        val recent = bookings.sortedByDescending { it.createdAt }.take(6).map { it.toResponse() }

        return AdminDashboard(
            totalEquipment = equipment.size,
            availableEquipment = equipmentByStatus[EquipmentStatus.AVAILABLE] ?: 0,
            bookedEquipment = equipmentByStatus[EquipmentStatus.BOOKED] ?: 0,
            maintenanceEquipment = equipmentByStatus[EquipmentStatus.MAINTENANCE] ?: 0,
            unavailableEquipment = equipmentByStatus[EquipmentStatus.UNAVAILABLE] ?: 0,
            totalBookings = bookings.size,
            pendingBookings = bookingsByStatus[BookingStatus.PENDING] ?: 0,
            approvedBookings = bookingsByStatus[BookingStatus.APPROVED] ?: 0,
            rejectedBookings = bookingsByStatus[BookingStatus.REJECTED] ?: 0,
            cancelledBookings = bookingsByStatus[BookingStatus.CANCELLED] ?: 0,
            completedBookings = bookingsByStatus[BookingStatus.COMPLETED] ?: 0,
            totalStudents = userRepo.countByRole(Role.STUDENT),
            totalBookedHours = Math.round(bookedMinutes / 60.0 * 10) / 10.0,
            topEquipment = top,
            recentBookings = recent
        )
    }

    @Transactional(readOnly = true)
    fun student(user: User): StudentDashboard {
        val mine = bookingRepo.findByUserIdOrderByDateDescStartTimeDesc(user.id!!)
        val today = LocalDate.now()
        val upcoming = mine
            .filter { (it.status == BookingStatus.APPROVED || it.status == BookingStatus.PENDING) && !it.date.isBefore(today) }
            .sortedWith(compareBy<Booking>({ it.date }, { it.startTime }))
            .take(5)
            .map { it.toResponse() }
        return StudentDashboard(
            totalBookings = mine.size,
            pendingBookings = mine.count { it.status == BookingStatus.PENDING },
            approvedBookings = mine.count { it.status == BookingStatus.APPROVED },
            completedBookings = mine.count { it.status == BookingStatus.COMPLETED },
            availableEquipment = equipmentService.findAll().count { it.status == EquipmentStatus.AVAILABLE },
            upcoming = upcoming
        )
    }
}
