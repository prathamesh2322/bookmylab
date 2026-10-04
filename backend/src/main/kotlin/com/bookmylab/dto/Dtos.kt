package com.bookmylab.dto

import com.bookmylab.model.*
import jakarta.validation.constraints.*
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.LocalTime

// ---------- Auth ----------
data class RegisterRequest(
    @field:NotBlank(message = "Name is required") val name: String?,
    @field:NotBlank(message = "Email is required") @field:Email(message = "Enter a valid email") val email: String?,
    @field:NotBlank(message = "Password is required") @field:Size(min = 6, message = "Password must be at least 6 characters") val password: String?
)

data class LoginRequest(
    @field:NotBlank(message = "Email is required") val email: String?,
    @field:NotBlank(message = "Password is required") val password: String?
)

data class UserDto(val id: Long, val name: String, val email: String, val role: Role)

data class AuthResponse(val token: String, val user: UserDto)

fun User.toDto() = UserDto(id!!, name, email, role)

// ---------- Equipment ----------
data class EquipmentRequest(
    @field:NotBlank(message = "Name is required") val name: String?,
    @field:NotBlank(message = "Category is required") val category: String?,
    @field:NotNull(message = "Quantity is required") @field:Min(value = 1, message = "Quantity must be at least 1") val quantity: Int?,
    @field:NotBlank(message = "Location is required") val location: String?,
    val condition: String? = "Good",
    val description: String? = "",
    val code: String? = null,
    val status: EquipmentStatus? = null
)

data class EquipmentResponse(
    val id: Long,
    val code: String,
    val name: String,
    val category: String,
    val quantity: Int,
    val availableQuantity: Int,
    val location: String,
    val condition: String,
    val description: String,
    val status: EquipmentStatus
)

data class ScheduleSlot(val date: LocalDate, val startTime: LocalTime, val endTime: LocalTime, val status: BookingStatus)

// ---------- Booking ----------
data class BookingRequest(
    @field:NotNull(message = "Equipment is required") val equipmentId: Long?,
    @field:NotNull(message = "Date is required") val date: LocalDate?,
    @field:NotNull(message = "Start time is required") val startTime: LocalTime?,
    @field:NotNull(message = "End time is required") val endTime: LocalTime?,
    @field:NotBlank(message = "Purpose is required") @field:Size(max = 200, message = "Purpose is too long") val purpose: String?
)

data class StatusUpdateRequest(@field:NotNull(message = "Status is required") val status: BookingStatus?)

data class BookingResponse(
    val id: Long,
    val bookingCode: String,
    val studentId: Long,
    val studentName: String,
    val equipmentId: Long,
    val equipmentName: String,
    val equipmentCode: String,
    val date: LocalDate,
    val startTime: LocalTime,
    val endTime: LocalTime,
    val purpose: String,
    val status: BookingStatus,
    val createdAt: LocalDateTime
)

fun Booking.toResponse() = BookingResponse(
    id = id!!,
    bookingCode = "BK${1000 + id!!}",
    studentId = user.id!!,
    studentName = user.name,
    equipmentId = equipment.id!!,
    equipmentName = equipment.name,
    equipmentCode = equipment.code,
    date = date,
    startTime = startTime,
    endTime = endTime,
    purpose = purpose,
    status = status,
    createdAt = createdAt
)

// ---------- Maintenance ----------
data class MaintenanceRequest(
    @field:NotNull(message = "Equipment is required") val equipmentId: Long?,
    @field:NotBlank(message = "Reason is required") val reason: String?,
    @field:NotNull(message = "Start date is required") val startDate: LocalDate?,
    val endDate: LocalDate? = null
)

data class MaintenanceResponse(
    val id: Long,
    val equipmentId: Long,
    val equipmentName: String,
    val reason: String,
    val startDate: LocalDate,
    val endDate: LocalDate?,
    val status: MaintenanceStatus
)

fun Maintenance.toResponse() = MaintenanceResponse(
    id!!, equipment.id!!, equipment.name, reason, startDate, endDate, status
)

// ---------- Dashboards ----------
data class NameCount(val name: String, val count: Int)

data class AdminDashboard(
    val totalEquipment: Int,
    val availableEquipment: Int,
    val bookedEquipment: Int,
    val maintenanceEquipment: Int,
    val unavailableEquipment: Int,
    val totalBookings: Int,
    val pendingBookings: Int,
    val approvedBookings: Int,
    val rejectedBookings: Int,
    val cancelledBookings: Int,
    val completedBookings: Int,
    val totalStudents: Long,
    val totalBookedHours: Double,
    val topEquipment: List<NameCount>,
    val recentBookings: List<BookingResponse>
)

data class StudentDashboard(
    val totalBookings: Int,
    val pendingBookings: Int,
    val approvedBookings: Int,
    val completedBookings: Int,
    val availableEquipment: Int,
    val upcoming: List<BookingResponse>
)

// ---------- Errors ----------
data class ErrorResponse(
    val status: Int,
    val error: String,
    val message: String,
    val fieldErrors: Map<String, String>? = null,
    val timestamp: LocalDateTime = LocalDateTime.now()
)
