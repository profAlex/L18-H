export type CreateUserDomainDto = {
    login: string;
    email: string;
    passwordHash: string;
    confirmationCode: string;
};
