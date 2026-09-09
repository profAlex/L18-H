import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length } from 'class-validator';

export class NewPasswordInputDto {
    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    @Length(6, 20)
    newPassword: string = '';

    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    recoveryCode: string = '';
}
