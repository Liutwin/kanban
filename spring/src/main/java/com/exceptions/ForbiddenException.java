package com.exceptions;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * Exception levée lorsqu'un utilisateur tente d'accéder à une ressource
 * pour laquelle il n'a pas les droits nécessaires.
 *
 * <p>L'annotation {@link ResponseStatus} garantit que Spring traduit
 * automatiquement cette exception en réponse HTTP {@code 403 Forbidden}.</p>
 */
@ResponseStatus(HttpStatus.FORBIDDEN)
public class ForbiddenException extends RuntimeException {

    /**
     * Construit une {@code ForbiddenException} avec le message fourni.
     *
     * @param message description de la violation d'accès
     */
    public ForbiddenException(String message) {
        super(message);
    }
}