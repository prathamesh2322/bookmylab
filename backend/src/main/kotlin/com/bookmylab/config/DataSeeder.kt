package com.bookmylab.config

import com.bookmylab.model.*
import com.bookmylab.repository.*
import org.slf4j.LoggerFactory
import org.springframework.boot.CommandLineRunner
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Component
import java.time.LocalDate
import java.time.LocalTime

/** Loads demo data on the first run so the dashboards are not empty. */
@Component
class DataSeeder(
    private val users: UserRepository,
    private val equipment: EquipmentRepository,
    private val bookings: BookingRepository,
    private val maintenance: MaintenanceRepository,
    private val encoder: PasswordEncoder
) : CommandLineRunner {

    private val log = LoggerFactory.getLogger(javaClass)

    override fun run(vararg args: String?) {
        if (users.count() > 0) return

        val admin = users.save(User(name = "Lab Admin", email = "admin@bookmylab.com", password = encoder.encode("admin123"), role = Role.ADMIN))
        val rahul = users.save(User(name = "Rahul Sharma", email = "rahul@student.com", password = encoder.encode("student123")))
        val prathamesh = users.save(User(name = "Prathamesh Patil", email = "prathamesh@student.com", password = encoder.encode("student123")))
        val sai = users.save(User(name = "Sai Kulkarni", email = "sai@student.com", password = encoder.encode("student123")))

        fun eq(code: String, name: String, cat: String, qty: Int, loc: String, cond: String, desc: String, status: EquipmentStatus = EquipmentStatus.AVAILABLE) =
            equipment.save(Equipment(code = code, name = name, category = cat, quantity = qty, location = loc, condition = cond, description = desc, status = status))

        val arduino = eq("ARD-001", "Arduino Uno R3", "Microcontroller", 5, "AIML Lab", "Good", "ATmega328P board for prototyping and mini projects.")
        val pi = eq("RPI-001", "Raspberry Pi 4", "IoT", 3, "IoT Lab", "Good", "Quad-core single board computer, 4 GB RAM.")
        val scope = eq("OSC-001", "Digital Oscilloscope", "Electronics", 2, "Electronics Lab", "Needs calibration", "2-channel 100 MHz digital storage oscilloscope.", EquipmentStatus.MAINTENANCE)
        val meter = eq("MUL-001", "Digital Multimeter", "Electronics", 10, "Electronics Lab", "Good", "Measures voltage, current and resistance.")
        eq("SEN-001", "Ultrasonic Sensor Kit", "Sensors", 8, "AIML Lab", "Good", "HC-SR04 sensors with jumper wires.")
        eq("ROB-001", "Robotic Arm Kit", "Robotics", 1, "Robotics Lab", "Fair", "4-DOF servo driven robotic arm.")
        eq("IOT-001", "IoT Starter Kit", "IoT", 4, "IoT Lab", "Good", "ESP8266 board, sensors, relay module.")
        eq("ESP-001", "ESP32 Dev Board", "Microcontroller", 6, "AIML Lab", "Good", "Wi-Fi + Bluetooth microcontroller board.")

        maintenance.save(Maintenance(equipment = scope, reason = "Probe calibration and display check", startDate = LocalDate.now().minusDays(2)))

        val today = LocalDate.now()
        fun bk(u: User, e: Equipment, dayOffset: Long, s: Int, en: Int, purpose: String, st: BookingStatus) =
            bookings.save(Booking(user = u, equipment = e, date = today.plusDays(dayOffset), startTime = LocalTime.of(s, 0), endTime = LocalTime.of(en, 0), purpose = purpose, status = st))

        bk(rahul, arduino, 1, 10, 12, "Mini Project", BookingStatus.APPROVED)
        bk(prathamesh, pi, 2, 14, 16, "IoT Home Automation", BookingStatus.PENDING)
        bk(sai, meter, 1, 11, 13, "Circuit testing", BookingStatus.PENDING)
        bk(sai, meter, -1, 9, 11, "Lab practical", BookingStatus.COMPLETED)
        bk(rahul, pi, -2, 15, 17, "Sensor data logging", BookingStatus.COMPLETED)
        bk(prathamesh, arduino, 3, 9, 10, "Robot car", BookingStatus.REJECTED)

        log.info("Demo data loaded. Admin: {} / admin123 | Student: rahul@student.com / student123", admin.email)
    }
}
