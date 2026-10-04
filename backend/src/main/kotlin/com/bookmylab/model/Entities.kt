package com.bookmylab.model

import jakarta.persistence.*
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.LocalTime

enum class Role { STUDENT, ADMIN }

enum class EquipmentStatus { AVAILABLE, BOOKED, MAINTENANCE, UNAVAILABLE }

enum class BookingStatus { PENDING, APPROVED, REJECTED, CANCELLED, COMPLETED }

enum class MaintenanceStatus { ONGOING, COMPLETED }

/** Table 1: users */
@Entity
@Table(name = "users")
class User(
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    var id: Long? = null,

    @Column(nullable = false)
    var name: String = "",

    @Column(nullable = false, unique = true)
    var email: String = "",

    @Column(nullable = false)
    var password: String = "",

    @Enumerated(EnumType.STRING) @Column(nullable = false)
    var role: Role = Role.STUDENT
)

/** Table 2: equipment */
@Entity
@Table(name = "equipment")
class Equipment(
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    var id: Long? = null,

    @Column(nullable = false, unique = true)
    var code: String = "",

    @Column(nullable = false)
    var name: String = "",

    @Column(nullable = false)
    var category: String = "",

    @Column(nullable = false)
    var quantity: Int = 1,

    @Column(nullable = false)
    var location: String = "",

    @Column(name = "equipment_condition", nullable = false)
    var condition: String = "Good",

    @Column(length = 500)
    var description: String = "",

    /** AVAILABLE / MAINTENANCE / UNAVAILABLE are stored. BOOKED is derived from live bookings. */
    @Enumerated(EnumType.STRING) @Column(nullable = false)
    var status: EquipmentStatus = EquipmentStatus.AVAILABLE
)

/** Table 3: bookings */
@Entity
@Table(name = "bookings")
class Booking(
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    var id: Long? = null,

    @ManyToOne(optional = false, fetch = FetchType.EAGER)
    @JoinColumn(name = "user_id")
    var user: User = User(),

    @ManyToOne(optional = false, fetch = FetchType.EAGER)
    @JoinColumn(name = "equipment_id")
    var equipment: Equipment = Equipment(),

    @Column(name = "booking_date", nullable = false)
    var date: LocalDate = LocalDate.now(),

    @Column(name = "start_time", nullable = false)
    var startTime: LocalTime = LocalTime.of(9, 0),

    @Column(name = "end_time", nullable = false)
    var endTime: LocalTime = LocalTime.of(10, 0),

    @Column(nullable = false)
    var purpose: String = "",

    @Enumerated(EnumType.STRING) @Column(nullable = false)
    var status: BookingStatus = BookingStatus.PENDING,

    @Column(name = "created_at", nullable = false)
    var createdAt: LocalDateTime = LocalDateTime.now()
)

/** Table 4: maintenance */
@Entity
@Table(name = "maintenance")
class Maintenance(
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    var id: Long? = null,

    @ManyToOne(optional = false, fetch = FetchType.EAGER)
    @JoinColumn(name = "equipment_id")
    var equipment: Equipment = Equipment(),

    @Column(nullable = false)
    var reason: String = "",

    @Column(name = "start_date", nullable = false)
    var startDate: LocalDate = LocalDate.now(),

    @Column(name = "end_date")
    var endDate: LocalDate? = null,

    @Enumerated(EnumType.STRING) @Column(nullable = false)
    var status: MaintenanceStatus = MaintenanceStatus.ONGOING
)
