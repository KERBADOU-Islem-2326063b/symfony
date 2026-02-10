<?php

namespace App\Security;

use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Http\Authentication\AuthenticationSuccessHandlerInterface;

class LoginSuccessHandler implements AuthenticationSuccessHandlerInterface
{
    public function onAuthenticationSuccess(Request $request, TokenInterface $token): JsonResponse
    {
        return new JsonResponse([
            'message' => 'successfully logged in',
            'user' => $token->getUser()->getUserIdentifier(),
            'roles' => $token->getUser()->getRoles(),
            'id' => $token->getUser()->getId(),
        ], Response::HTTP_OK);
    }
}
