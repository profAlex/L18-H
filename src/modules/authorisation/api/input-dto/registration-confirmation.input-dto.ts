import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RegistrationConfirmationInputDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    code: string = '';
}
