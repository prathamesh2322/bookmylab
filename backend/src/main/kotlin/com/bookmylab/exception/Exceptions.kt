package com.bookmylab.exception

import com.bookmylab.dto.ErrorResponse
import org.slf4j.LoggerFactory
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.http.converter.HttpMessageNotReadableException
import org.springframework.web.HttpRequestMethodNotSupportedException
import org.springframework.web.servlet.resource.NoResourceFoundException
import org.springframework.web.bind.MethodArgumentNotValidException
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.RestControllerAdvice
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException

/** Exp 6: custom exception hierarchy, each mapped to an HTTP status by the handler below. */
sealed class BookMyLabException(message: String, val status: HttpStatus) : RuntimeException(message)

class NotFoundException(message: String) : BookMyLabException(message, HttpStatus.NOT_FOUND)
class ConflictException(message: String) : BookMyLabException(message, HttpStatus.CONFLICT)
class BadRequestException(message: String) : BookMyLabException(message, HttpStatus.BAD_REQUEST)
class UnauthorizedException(message: String) : BookMyLabException(message, HttpStatus.UNAUTHORIZED)
class ForbiddenException(message: String) : BookMyLabException(message, HttpStatus.FORBIDDEN)

@RestControllerAdvice
class GlobalExceptionHandler {
    private val log = LoggerFactory.getLogger(javaClass)

    @ExceptionHandler(BookMyLabException::class)
    fun handleApp(e: BookMyLabException): ResponseEntity<ErrorResponse> =
        ResponseEntity.status(e.status)
            .body(ErrorResponse(e.status.value(), e.status.reasonPhrase, e.message ?: "Error"))

    @ExceptionHandler(MethodArgumentNotValidException::class)
    fun handleValidation(e: MethodArgumentNotValidException): ResponseEntity<ErrorResponse> {
        val fields = e.bindingResult.fieldErrors.associate { it.field to (it.defaultMessage ?: "Invalid value") }
        return ResponseEntity.badRequest().body(
            ErrorResponse(400, "Bad Request", fields.values.firstOrNull() ?: "Validation failed", fields)
        )
    }

    @ExceptionHandler(HttpMessageNotReadableException::class, MethodArgumentTypeMismatchException::class)
    fun handleUnreadable(e: Exception): ResponseEntity<ErrorResponse> =
        ResponseEntity.badRequest().body(
            ErrorResponse(400, "Bad Request", "Malformed request. Check date (yyyy-MM-dd) and time (HH:mm) formats.")
        )

    @ExceptionHandler(NoResourceFoundException::class)
    fun handleNoResource(e: NoResourceFoundException): ResponseEntity<ErrorResponse> =
        ResponseEntity.status(404).body(ErrorResponse(404, "Not Found", "Resource not found."))

    @ExceptionHandler(HttpRequestMethodNotSupportedException::class)
    fun handleMethod(e: HttpRequestMethodNotSupportedException): ResponseEntity<ErrorResponse> =
        ResponseEntity.status(405).body(ErrorResponse(405, "Method Not Allowed", e.message ?: "Method not allowed"))

    @ExceptionHandler(Exception::class)
    fun handleOther(e: Exception): ResponseEntity<ErrorResponse> {
        log.error("Unexpected error", e)
        return ResponseEntity.status(500).body(ErrorResponse(500, "Internal Server Error", "Something went wrong on the server."))
    }
}
