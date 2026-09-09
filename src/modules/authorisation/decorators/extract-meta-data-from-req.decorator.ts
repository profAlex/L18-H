import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';

// кастомный декоратор в котором извлекаем все метаданные из req.user, включая пэйлоад refresh-jwt и id сессии
export const CurrentUserMetaData = createParamDecorator(
    (data: unknown, ctx: ExecutionContext) => {
        const request = ctx.switchToHttp().getRequest();

        if (!request.user) {
            throw new UnauthorizedException('User payload not found in request');
        }

        return request.user;
    },
);