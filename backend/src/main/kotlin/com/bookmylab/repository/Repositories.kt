package com.bookmylab.repository

import com.bookmylab.model.*
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import java.time.LocalDate
import java.time.LocalTime

interface UserRepository : JpaRepository<User, Long> {
    fun findByEmail(email: String): User?
    fun existsByEmail(email: String): Boolean
    fun countByRole(role: Role): Long
}

interface EquipmentRepository : JpaRepository<Equipment, Long> {
    fun existsByCode(code: String): Boolean
}

interface BookingRepository : JpaRepository<Booking, Long> {

    fun findAllByOrderByDateDescStartTimeDesc(): List<Booking>

    fun findByUserIdOrderByDateDescStartTimeDesc(userId: Long): List<Booking>

    /** Core business rule: bookings of the same equipment whose time range overlaps the requested one. */
    @Query(
        """
        select b from Booking b
        where b.equipment.id = :equipmentId
          and b.date = :date
          and b.status in :statuses
          and b.startTime < :endTime
          and b.endTime > :startTime
        order by b.startTime
        """
    )
    fun findOverlapping(
        @Param("equipmentId") equipmentId: Long,
        @Param("date") date: LocalDate,
        @Param("startTime") startTime: LocalTime,
        @Param("endTime") endTime: LocalTime,
        @Param("statuses") statuses: Collection<BookingStatus>
    ): List<Booking>

    fun findByEquipmentIdAndDateGreaterThanEqualAndStatusInOrderByDateAscStartTimeAsc(
        equipmentId: Long,
        date: LocalDate,
        statuses: Collection<BookingStatus>
    ): List<Booking>

    fun deleteByEquipmentId(equipmentId: Long)
}

interface MaintenanceRepository : JpaRepository<Maintenance, Long> {
    fun findAllByOrderByStartDateDescIdDesc(): List<Maintenance>
    fun findByEquipmentIdAndStatus(equipmentId: Long, status: MaintenanceStatus): List<Maintenance>
    fun deleteByEquipmentId(equipmentId: Long)
}
