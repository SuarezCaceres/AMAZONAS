package com.amazonas.backend.common.exception;

import java.util.HashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    // DTO de respuesta para estructurar todos los errores del API de manera uniforme
    public record ErrorResponse(
            String message,
            int status,
            long timestamp,
            Map<String, String> details
    ) {}

    /**
     * Maneja las excepciones ResponseStatusException lanzadas explícitamente en el código.
     */
    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<ErrorResponse> handleResponseStatusException(ResponseStatusException ex) {
        log.warn("ResponseStatusException capturada: {} - {}", ex.getStatusCode(), ex.getReason());
        
        ErrorResponse response = new ErrorResponse(
                ex.getReason(),
                ex.getStatusCode().value(),
                System.currentTimeMillis(),
                null
        );
        return new ResponseEntity<>(response, ex.getStatusCode());
    }

    /**
     * Maneja errores de validación de campos (@Valid en los DTOs de entrada).
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidationException(MethodArgumentNotValidException ex) {
        log.warn("MethodArgumentNotValidException capturada: {} errores de validacion", ex.getBindingResult().getErrorCount());
        
        Map<String, String> details = new HashMap<>();
        ex.getBindingResult().getAllErrors().forEach(error -> {
            String fieldName = ((FieldError) error).getField();
            String errorMessage = error.getDefaultMessage();
            details.put(fieldName, errorMessage);
        });

        ErrorResponse response = new ErrorResponse(
                "Error de validacion en los datos de la solicitud",
                HttpStatus.BAD_REQUEST.value(),
                System.currentTimeMillis(),
                details
        );
        return new ResponseEntity<>(response, HttpStatus.BAD_REQUEST);
    }

    /**
     * Maneja cualquier otra excepción no controlada, evitando fugas de detalles internos.
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGenericException(Exception ex) {
        log.error("Excepcion no controlada capturada en el API", ex);
        
        ErrorResponse response = new ErrorResponse(
                "Ha ocurrido un error interno en el servidor. Por favor, intenta mas tarde.",
                HttpStatus.INTERNAL_SERVER_ERROR.value(),
                System.currentTimeMillis(),
                null
        );
        return new ResponseEntity<>(response, HttpStatus.INTERNAL_SERVER_ERROR);
    }
}
