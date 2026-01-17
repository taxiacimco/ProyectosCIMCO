package com.cimco.api.config;

import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseToken;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

/**
 * Configuración de seguridad principal de CIMCO API.
 * Implementa validación de tokens de Firebase para proteger los endpoints financieros y administrativos.
 */
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(csrf -> csrf.disable()) // Deshabilitado porque usamos tokens JWT (Stateless)
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                // El endpoint de Webhook debe ser público porque Taxia no envía tokens de Firebase
                .requestMatchers("/api/viajes/solicitar").permitAll() 
                
                // Endpoints que requieren autenticación del administrador
                .requestMatchers("/api/viajes/reporte-ganancias", "/api/viajes/listar").authenticated()
                .requestMatchers("/api/usuarios/pagar-comision", "/api/notificaciones/**").authenticated()
                
                // Cualquier otra ruta protegida por defecto
                .anyRequest().authenticated()
            )
            // Agregamos nuestro validador de tokens antes de los filtros de Spring Security
            .addFilterBefore(new FirebaseTokenFilter(), UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    /**
     * Filtro interno que intercepta las peticiones y valida el Token con Firebase Admin SDK.
     */
    private static class FirebaseTokenFilter extends OncePerRequestFilter {
        @Override
        protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
                throws ServletException, IOException {
            
            String header = request.getHeader("Authorization");

            // Buscamos el header "Authorization: Bearer <TOKEN>"
            if (header != null && header.startsWith("Bearer ")) {
                String idToken = header.replace("Bearer ", "");
                try {
                    // Validar token con el SDK de Firebase (Previamente inicializado en FirebaseConfig)
                    FirebaseToken decodedToken = FirebaseAuth.getInstance().verifyIdToken(idToken);
                    String uid = decodedToken.getUid();

                    // Si el token es legítimo, creamos un objeto de autenticación para Spring
                    UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                            uid, null, Collections.emptyList());
                    
                    SecurityContextHolder.getContext().setAuthentication(auth);
                    
                } catch (Exception e) {
                    System.err.println("❌ Error en Seguridad: Token de Firebase inválido o expirado.");
                }
            }
            filterChain.doFilter(request, response);
        }
    }

    /**
     * Configuración de CORS para permitir que el Panel Administrativo (Frontend)
     * pueda realizar peticiones a esta API desde otros dominios o puertos.
     */
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        
        // En producción, cambia "*" por la URL de tu panel administrativo
        configuration.setAllowedOriginPatterns(List.of("*")); 
        
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));
        configuration.setAllowedHeaders(Arrays.asList("Authorization", "Content-Type", "X-Requested-With", "Accept"));
        
        // Permite que el navegador envíe el header Authorization
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}