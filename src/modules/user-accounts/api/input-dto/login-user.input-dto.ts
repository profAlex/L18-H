import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class UserLoginInputDto {
    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    loginOrEmail: string = '';

    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    password: string = '';
}
