import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class EmailService {
    constructor(private mailerService: MailerService) {}

    async sendConfirmationEmail(email: string, code: string): Promise<void> {
        // //can add html templates, implement advertising and other logic for mailing...
        // this.mailerService
        //     .sendMail({
        //         subject: `finish registration`,
        //         to: email,
        //         text: `finish registration via link https://somesite.com/confirm-registration?code=${code}`,
        //         html: `<h1>Registration completion</h1>
        // <p>To finish registration please follow the link below:
        //     <a href="https://somesite.com/confirm-registration?code=${code}">complete registration</a>
        // </p>`,
        //     })
        //     .catch((err) => {
        //         console.error(
        //             'Password recovery email failed in background:',
        //             err,
        //         );
        //     });


        return;
    }

    async sendRecoveryEmail(email: string, code: string): Promise<void> {
        // this.mailerService
        //     .sendMail({
        //         subject: `password recovery`,
        //         to: email,
        //         text: `confirm password recovery via link https://somesite.com/password-recovery?code=${code}`,
        //         html: `<h1>Password recovery</h1>
        // <p>To confirm password recovery please follow the link below:
        //     <a href="https://somesite.com/password-recovery?code=${code}">recovery password</a>
        // </p>`,
        //     })
        //     .catch((err) => {
        //         console.error(
        //             'Password recovery email failed in background:',
        //             err,
        //         );
        //     });

        return;
    }
}
