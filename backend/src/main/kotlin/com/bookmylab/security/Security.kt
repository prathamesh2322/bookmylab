package com.bookmylab.security

import com.bookmylab.dto.ErrorResponse
import com.bookmylab.model.User
import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.databind.SerializationFeature
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule
import io.jsonwebtoken.Jwts
import io.jsonwebtoken.security.Keys
import jakarta.servlet.FilterChain
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.beans.factory.annotation.Value
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.http.HttpMethod
import org.springframework.http.MediaType
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken
import org.springframework.security.config.annotation.web.builders.HttpSecurity
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity
import org.springframework.security.config.http.SessionCreationPolicy
import org.springframework.security.core.authority.SimpleGrantedAuthority
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.security.web.SecurityFilterChain
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter
import org.springframework.stereotype.Component
import org.springframework.web.cors.CorsConfiguration
import org.springframework.web.cors.CorsConfigurationSource
import org.springframework.web.cors.UrlBasedCorsConfigurationSource
import org.springframework.web.filter.OncePerRequestFilter
import java.util.Date

/** Creates and validates signed JWTs (HS256). */
@Component
class JwtService(
    @Value("\${jwt.secret}") secret: String,
    @Value("\${jwt.expiration-ms}") private val expirationMs: Long
) {
    private val key = Keys.hmacShaKeyFor(secret.toByteArray())

    fun generateToken(user: User): String {
        val now = Date()
        return Jwts.builder()
            .subject(user.email)
            .claim("role", user.role.name)
            .claim("name", user.name)
            .issuedAt(now)
            .expiration(Date(now.time + expirationMs))
            .signWith(key)
            .compact()
    }

    /** Returns (email, role) or null if the token is invalid/expired. */
    fun parse(token: String): Pair<String, String>? = try {
        val claims = Jwts.parser().verifyWith(key).build().parseSignedClaims(token).payload
        claims.subject to (claims["role"] as String)
    } catch (e: Exception) {
        null
    }
}

/** Reads "Authorization: Bearer <token>" and populates the security context. */
@Component
class JwtAuthFilter(private val jwtService: JwtService) : OncePerRequestFilter() {
    override fun doFilterInternal(request: HttpServletRequest, response: HttpServletResponse, chain: FilterChain) {
        val header = request.getHeader("Authorization")
        if (header != null && header.startsWith("Bearer ")) {
            jwtService.parse(header.substring(7))?.let { (email, role) ->
                val auth = UsernamePasswordAuthenticationToken(email, null, listOf(SimpleGrantedAuthority("ROLE_$role")))
                SecurityContextHolder.getContext().authentication = auth
            }
        }
        chain.doFilter(request, response)
    }
}

@Configuration
@EnableWebSecurity
class SecurityConfig(private val jwtAuthFilter: JwtAuthFilter) {

    @Bean
    fun passwordEncoder(): PasswordEncoder = BCryptPasswordEncoder()

    @Bean
    fun corsConfigurationSource(): CorsConfigurationSource {
        val config = CorsConfiguration().apply {
            allowedOriginPatterns = listOf("*")
            allowedMethods = listOf("GET", "POST", "PUT", "DELETE", "OPTIONS")
            allowedHeaders = listOf("*")
        }
        return UrlBasedCorsConfigurationSource().apply { registerCorsConfiguration("/**", config) }
    }

    @Bean
    fun filterChain(http: HttpSecurity): SecurityFilterChain {
        val mapper = ObjectMapper().registerModule(JavaTimeModule()).disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS)

        fun writeError(res: HttpServletResponse, status: Int, error: String, message: String) {
            res.status = status
            res.contentType = MediaType.APPLICATION_JSON_VALUE
            res.writer.write(mapper.writeValueAsString(ErrorResponse(status, error, message)))
        }

        http
            .csrf { it.disable() }
            .cors { }
            .sessionManagement { it.sessionCreationPolicy(SessionCreationPolicy.STATELESS) }
            .authorizeHttpRequests { auth ->
                auth
                    .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                    // public
                    .requestMatchers("/api/auth/login", "/api/auth/register", "/api/health", "/api/demo/**").permitAll()
                    .requestMatchers(HttpMethod.GET, "/api/equipment", "/api/equipment/**").permitAll()
                    // admin only
                    .requestMatchers("/api/equipment", "/api/equipment/**").hasRole("ADMIN")
                    .requestMatchers("/api/maintenance", "/api/maintenance/**").hasRole("ADMIN")
                    .requestMatchers("/api/dashboard/admin").hasRole("ADMIN")
                    .requestMatchers(HttpMethod.PUT, "/api/bookings/*/status").hasRole("ADMIN")
                    // any logged-in user
                    .requestMatchers("/api/**").authenticated()
                    // React single page app + static files
                    .anyRequest().permitAll()
            }
            .exceptionHandling {
                it.authenticationEntryPoint { _, res, _ ->
                    writeError(res, 401, "Unauthorized", "Login required or token expired.")
                }
                it.accessDeniedHandler { _, res, _ ->
                    writeError(res, 403, "Forbidden", "You do not have permission to do this.")
                }
            }
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter::class.java)

        return http.build()
    }
}
