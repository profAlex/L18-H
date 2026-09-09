import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserAccessTokenContextDto } from '../guards/dto/user-access-token-context.dto';

export const ExtractUserIfExistsFromRequest = createParamDecorator(
    (data: unknown, context: ExecutionContext): UserAccessTokenContextDto | null => {
        const request = context.switchToHttp().getRequest();

        if (!request.user) {
            return null;
        }

        return request.user;
    },
);

export const ExtractLoginIfUserExists = createParamDecorator(
    (data: unknown, context: ExecutionContext): UserAccessTokenContextDto | null => {
        const request = context.switchToHttp().getRequest();

        if (!request.user) {
            return null;
        }

        return request.user;
    },
);
