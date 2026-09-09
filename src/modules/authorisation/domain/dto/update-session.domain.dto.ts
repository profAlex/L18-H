import { Type } from 'class-transformer';
import { IsDate, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateSessionDomainDto {
    // фронтенд отправляет запрос в формате JSON.
    // в спецификации JSON не существует типа данных Date. JSON умеет передавать только:
    //     строки (string)
    //     числа (number)
    //     булевы значения (boolean)
    //     объекты (object) / Массивы (array)
    //     null
    // и по сети дата летит как обычная строка (в формате ISO-8601, например, '2026-06-15T15:30:00.000Z'),
    // декоратор @Type(() => Date) перехватывает эту входящую строку и превращает её в полноценный JS-объект new Date()
    @ApiProperty({
        type: String,
        format: 'date-time', // специальное поле, чтобы Swagger понял, что это ISO-строка даты
        example: '2026-06-15T15:30:00.000Z',
    })
    @Type(() => Date) // принудительно превращает строку из JSON в объект Date
    @IsDate()
    @IsNotEmpty()
    issuedAt: Date = new Date(0);

    @ApiProperty({
        type: String,
        format: 'date-time', // специальное поле, чтобы Swagger понял, что это ISO-строка даты
        example: '2026-06-15T15:30:00.000Z',
    })
    @Type(() => Date) // принудительно превращает строку из JSON в объект Date
    @IsDate()
    @IsNotEmpty()
    expiresAt: Date = new Date(0);
}


export type UpdateSessionDto = {
    issuedAt: Date;
    expiresAt: Date;
}