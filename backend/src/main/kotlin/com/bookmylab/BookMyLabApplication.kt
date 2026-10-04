package com.bookmylab

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.autoconfigure.security.servlet.UserDetailsServiceAutoConfiguration
import org.springframework.boot.runApplication

@SpringBootApplication(exclude = [UserDetailsServiceAutoConfiguration::class])
class BookMyLabApplication

fun main(args: Array<String>) {
    runApplication<BookMyLabApplication>(*args)
}
