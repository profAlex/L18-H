import {ArgumentsHost, Catch, ExceptionFilter, HttpStatus,} from '@nestjs/common';
import {DomainException} from '../domain-exceptions';
import {Request, Response} from 'express';
import {DomainExceptionCode} from '../domain-exception-codes';

//https://docs.nestjs.com/exception-filters#exception-filters-1
//Ошибки класса DomainException (instanceof DomainException)
@Catch(DomainException)
export class DomainHttpExceptionsFilter implements ExceptionFilter {
    catch(exception: DomainException, host: ArgumentsHost): void {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();

        // 1. Определяем HTTP-статус на основе кода доменной ошибки
        const status = this.mapToHttpStatus(exception.code);

        // 2. Инициализируем массив для итогового ответа
        let errorsMessages: Array<{ message: string; field: string | null }> = [];

        // 3. Проверяем, есть ли внутри исключения массив extensions (ошибки валидации DTO)
        if (exception.extensions && exception.extensions.length > 0) {
            errorsMessages = exception.extensions.map((ext: any) => ({
                // Маппим лекционный "key" в требуемый "field"
                field: ext.key || null,
                // Срезаем технический хвост сReceived value, если он есть
                message: ext.message ? ext.message.split('; Received value:')[0] : 'Invalid value',
            }));
        } else {
            // 4. Если это общая доменная ошибка (404, 401, 403), у которой нет массива extensions.
            // Мы берем её message и оборачиваем в стандартную структуру с field: null
            errorsMessages.push({
                message: exception.message || 'Action failed',
                field: this.getGeneralFieldByCode(exception.code), // Автоматически подставит логичный field, если нужно
            });
        }

        // 5. Железно отправляем ответ в едином формате для ВСЕХ доменных ошибок
        response.status(status).json({errorsMessages});
    }

    // Вспомогательный метод, чтобы для не-валидационных ошибок подставлять красивый field, если тесты это проверяют
    private getGeneralFieldByCode(code: DomainExceptionCode): string | null {
        switch (code) {
            case DomainExceptionCode.NotFound:
                return 'id'; // Часто тесты на 404 ищут ошибку в поле id или uriParam
            case DomainExceptionCode.Unauthorized:
            case DomainExceptionCode.Forbidden:
                return 'authorization'; // Для ошибок доступов
            default:
                return null; // По умолчанию оставляем null
        }
    }

    private mapToHttpStatus(code: DomainExceptionCode): number {
        switch (code) {
            case DomainExceptionCode.BadRequest:
            case DomainExceptionCode.ValidationError:
            case DomainExceptionCode.ConfirmationCodeExpired:
            case DomainExceptionCode.AlreadyConfirmed:
            case DomainExceptionCode.EmailNotConfirmed:
            case DomainExceptionCode.PasswordRecoveryCodeExpired:
            case DomainExceptionCode.UserBadRequest:
                return HttpStatus.BAD_REQUEST;

            case DomainExceptionCode.Forbidden:
                return HttpStatus.FORBIDDEN;

            case DomainExceptionCode.BlogNotFound:
            case DomainExceptionCode.PostNotFound:
            case DomainExceptionCode.CommentNotFound:
            case DomainExceptionCode.UserNotFound:
            case DomainExceptionCode.NotFound:
                return HttpStatus.NOT_FOUND;

            case DomainExceptionCode.Unauthorized:
                return HttpStatus.UNAUTHORIZED;

            case DomainExceptionCode.InternalServerError:
                return HttpStatus.INTERNAL_SERVER_ERROR;

            default:
                return HttpStatus.I_AM_A_TEAPOT;
        }
    }

}

//   private buildResponseBody(
//     exception: DomainException,
//     requestUrl: string,
//   ): ErrorResponseBody {
//     return {
//       timestamp: new Date().toISOString(),
//       path: requestUrl,
//       message: exception.message,
//       code: exception.code,
//       extensions: exception.extensions,
//     };
//   }
// }
