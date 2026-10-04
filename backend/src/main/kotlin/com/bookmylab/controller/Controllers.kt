package com.bookmylab.controller

import com.bookmylab.demo.KotlinConcepts
import com.bookmylab.dto.*
import com.bookmylab.service.*
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.core.Authentication
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/auth")
class AuthController(private val authService: AuthService) {

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    fun register(@Valid @RequestBody req: RegisterRequest): AuthResponse = authService.register(req)

    @PostMapping("/login")
    fun login(@Valid @RequestBody req: LoginRequest): AuthResponse = authService.login(req)

    @GetMapping("/me")
    fun me(auth: Authentication): UserDto = authService.currentUser(auth).toDto()
}

@RestController
@RequestMapping("/api/equipment")
class EquipmentController(private val service: EquipmentService) {

    @GetMapping
    fun all(): List<EquipmentResponse> = service.findAll()

    @GetMapping("/{id}")
    fun one(@PathVariable id: Long): EquipmentResponse = service.findOne(id)

    /** Upcoming PENDING/APPROVED slots, so students can see when the item is already taken. */
    @GetMapping("/{id}/schedule")
    fun schedule(@PathVariable id: Long): List<ScheduleSlot> = service.schedule(id)

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    fun create(@Valid @RequestBody req: EquipmentRequest): EquipmentResponse = service.create(req)

    @PutMapping("/{id}")
    fun update(@PathVariable id: Long, @Valid @RequestBody req: EquipmentRequest): EquipmentResponse = service.update(id, req)

    @DeleteMapping("/{id}")
    fun delete(@PathVariable id: Long): ResponseEntity<Map<String, String>> {
        service.delete(id)
        return ResponseEntity.ok(mapOf("message" to "Equipment #$id deleted."))
    }
}

@RestController
@RequestMapping("/api/bookings")
class BookingController(
    private val service: BookingService,
    private val authService: AuthService
) {
    @GetMapping
    fun list(auth: Authentication): List<BookingResponse> = service.list(authService.currentUser(auth))

    @GetMapping("/{id}")
    fun one(@PathVariable id: Long, auth: Authentication): BookingResponse = service.get(id, authService.currentUser(auth))

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    fun create(@Valid @RequestBody req: BookingRequest, auth: Authentication): BookingResponse =
        service.create(authService.currentUser(auth), req)

    @PutMapping("/{id}")
    fun update(@PathVariable id: Long, @Valid @RequestBody req: BookingRequest, auth: Authentication): BookingResponse =
        service.update(id, authService.currentUser(auth), req)

    /** Admin: approve / reject / complete. */
    @PutMapping("/{id}/status")
    fun status(@PathVariable id: Long, @Valid @RequestBody req: StatusUpdateRequest): BookingResponse =
        service.changeStatus(id, req.status!!)

    @PutMapping("/{id}/cancel")
    fun cancel(@PathVariable id: Long, auth: Authentication): BookingResponse =
        service.cancel(id, authService.currentUser(auth))

    @DeleteMapping("/{id}")
    fun delete(@PathVariable id: Long, auth: Authentication): ResponseEntity<Map<String, String>> {
        service.delete(id, authService.currentUser(auth))
        return ResponseEntity.ok(mapOf("message" to "Booking #$id deleted."))
    }
}

@RestController
@RequestMapping("/api/maintenance")
class MaintenanceController(private val service: MaintenanceService) {

    @GetMapping
    fun list(): List<MaintenanceResponse> = service.list()

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    fun create(@Valid @RequestBody req: MaintenanceRequest): MaintenanceResponse = service.create(req)

    @PutMapping("/{id}/complete")
    fun complete(@PathVariable id: Long): MaintenanceResponse = service.complete(id)

    @DeleteMapping("/{id}")
    fun delete(@PathVariable id: Long): ResponseEntity<Map<String, String>> {
        service.delete(id)
        return ResponseEntity.ok(mapOf("message" to "Maintenance record #$id deleted."))
    }
}

@RestController
@RequestMapping("/api/dashboard")
class DashboardController(
    private val service: DashboardService,
    private val authService: AuthService
) {
    @GetMapping("/admin")
    fun admin(): AdminDashboard = service.admin()

    @GetMapping("/student")
    fun student(auth: Authentication): StudentDashboard = service.student(authService.currentUser(auth))
}

@RestController
@RequestMapping("/api")
class UtilityController {

    @GetMapping("/health")
    fun health(): Map<String, String> = mapOf("status" to "UP", "app" to "BookMyLab")

    /** Exp 5 + 6 showcase: Kotlin data types, collections, OOP, exception handling, map/filter/reduce. */
    @GetMapping("/demo/kotlin")
    fun kotlinDemo(): Map<String, List<String>> = KotlinConcepts.run()
}
