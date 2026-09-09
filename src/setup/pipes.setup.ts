import {
    INestApplication,
    ValidationError,
    ValidationPipe,
} from '@nestjs/common';
import { Error } from 'mongoose';
import {
    DomainException,
    Extension,
} from '../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../core/exceptions/domain-exception-codes';

export const errorFormatter = (
    errors: ValidationError[],
    errorMessage?: any,
): Extension[] => {
    const errorsForResponse = errorMessage || [];

    for (const error of errors) {
        if (!error.constraints && error.children?.length) {
            // Рекурсия для вложенных объектов остается нетронутой
            errorFormatter(error.children, errorsForResponse);
        } else if (error.constraints) {
            const constrainKeys = Object.keys(error.constraints);

            // берем ТОЛЬКО первый ключ ошибки для этого поля, class-validator как-то странно работает, при stopAtFirstError: true, иногда перестает идти дальше, надо разбираться..так пока что работает
            if (constrainKeys.length > 0) {
                const firstKey = constrainKeys[0];

                errorsForResponse.push({
                    message: error.constraints[firstKey]
                        ? `${error.constraints[firstKey]}; Received value: ${error?.value}`
                        : '',
                    key: error.property, // Если тесты требуют строго "field", замени это свойство на field: error.property
                });
            }
        }
    }

    return errorsForResponse;
};

export function pipesSetup(app: INestApplication) {
    //Глобальный пайп для валидации и трансформации входящих данных.
    app.useGlobalPipes(
        // new ObjectIdValidationTransformationPipe(),
        new ValidationPipe({
            //class-transformer создает экземпляр dto
            //соответственно применятся значения по-умолчанию
            //и методы классов dto
            transform: true,

            whitelist: true,

            //Выдавать первую ошибку для каждого поля
            stopAtFirstError: true,
            // Для преобразования ошибок класс валидатора в необходимый вид
            exceptionFactory: (errors) => {
                const formattedErrors = errorFormatter(errors);

                throw new DomainException({
                    code: DomainExceptionCode.ValidationError,
                    message: 'Validation failed',
                    extensions: formattedErrors,
                });
            },
        }),
    );
}
