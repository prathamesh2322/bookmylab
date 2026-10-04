package com.bookmylab.demo

/**
 * Experiments 5 and 6 in one file.
 * Exp 5: data types, collections, OOP (classes, inheritance, polymorphism).
 * Exp 6: exception handling and collection operations (map, filter, reduce).
 * Open  GET /api/demo/kotlin  to see the output.
 */

// ---------- Exp 5: OOP - classes and inheritance ----------
open class LabMember(val name: String, val email: String) {
    open val role: String = "Member"
    open fun maxBookingHours(): Int = 2
    fun describe(): String = "$name <$email> is a $role who may book up to ${maxBookingHours()} hour(s)"
}

class StudentMember(name: String, email: String, val rollNo: Int) : LabMember(name, email) {
    override val role = "Student"
    override fun maxBookingHours() = 3
}

class LabAdminMember(name: String, email: String) : LabMember(name, email) {
    override val role = "Lab Admin"
    override fun maxBookingHours() = 12
}

// data class: automatic equals/hashCode/toString/copy
data class EquipmentItem(val name: String, val category: String, val quantity: Int, val available: Boolean)

// ---------- Exp 6: custom exception ----------
class InvalidQuantityException(message: String) : Exception(message)

fun validateQuantity(quantity: Int): Int {
    if (quantity < 1) throw InvalidQuantityException("Quantity must be at least 1 but was $quantity")
    return quantity
}

object KotlinConcepts {

    fun run(): Map<String, List<String>> {
        val out = linkedMapOf<String, List<String>>()

        // --- Data types ---
        val itemName: String = "Arduino Uno"
        val quantity: Int = 10
        val weightKg: Double = 0.025
        val ok: Boolean = true
        val grade: Char = 'A'
        val serial: Long = 9_000_000_001L
        out["1. Data types"] = listOf(
            "String  itemName = $itemName",
            "Int     quantity = $quantity",
            "Double  weightKg = $weightKg",
            "Boolean ok = $ok",
            "Char    grade = $grade",
            "Long    serial = $serial"
        )

        // --- Collections ---
        val items = listOf(
            EquipmentItem("Arduino Uno", "Microcontroller", 5, true),
            EquipmentItem("Raspberry Pi 4", "IoT", 3, true),
            EquipmentItem("Oscilloscope", "Electronics", 2, false),
            EquipmentItem("Multimeter", "Electronics", 10, true)
        )
        val categories: Set<String> = items.map { it.category }.toSet()
        val stock: Map<String, Int> = items.associate { it.name to it.quantity }
        out["2. Collections"] = listOf("List size = ${items.size}", "Set (unique categories) = $categories", "Map (name -> quantity) = $stock")

        // --- OOP ---
        val members: List<LabMember> = listOf(
            StudentMember("Rahul", "rahul@student.com", 21),
            LabAdminMember("Lab Admin", "admin@bookmylab.com")
        )
        out["3. OOP: classes, inheritance, polymorphism"] = members.map { it.describe() }

        // --- map / filter / reduce ---
        val availableNames = items.filter { it.available }.map { it.name }
        val totalUnits = items.map { it.quantity }.reduce { sum, q -> sum + q }
        val electronicsUnits = items.filter { it.category == "Electronics" }.map { it.quantity }.reduce { a, b -> a + b }
        out["4. map / filter / reduce"] = listOf(
            "filter+map  available items = $availableNames",
            "map+reduce  total units = $totalUnits",
            "filter+map+reduce  electronics units = $electronicsUnits"
        )

        // --- Exception handling ---
        val results = mutableListOf<String>()
        for (q in listOf(5, 0, -3)) {
            try {
                results += "validateQuantity($q) -> OK: ${validateQuantity(q)}"
            } catch (e: InvalidQuantityException) {
                results += "validateQuantity($q) -> caught InvalidQuantityException: ${e.message}"
            } finally {
                results += "   (finally block executed for q=$q)"
            }
        }
        val zero = items.count { it.quantity > 100 } // no item has quantity > 100, so this is 0
        val division = try { quantity / zero } catch (e: ArithmeticException) { -1 }
        results += "$quantity / $zero handled with try/catch expression -> $division"
        out["5. Exception handling"] = results

        return out
    }
}
