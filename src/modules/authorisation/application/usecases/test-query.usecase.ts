import { IQueryHandler, Query, QueryHandler } from '@nestjs/cqrs';
import { SessionsCommandRepository } from '../../infrastructure/session/sessions.command-repository';

export class TestQuery extends Query<string> {
    constructor(
        // public readonly userId: string,
        // public readonly req: Request,
    ) {
        super();
    }
}

@QueryHandler(TestQuery)
export class TestQueryHandler implements IQueryHandler<TestQuery> {
    constructor(
        // private usersExternalQueryRepository: UsersExternalQueryRepository,
        // private postsQueryRepository: PostsQueryRepository,
        // @InjectModel(Session.name) private SessionModel: SessionModelType,
        private sessionsCommandRepository: SessionsCommandRepository,
        // private jwtTokenProvider: JwtTokenProvider,
    ) {}

    async execute(
        // { userId, req }: LoginUser
    ): Promise<string> {
        // // создаем мета данные для сессии
        // const deviceName = req.get('User-Agent') || 'unknown device'; // или req.headers['user-agent'] - обязательно с малыми, т.к. по стандарту http все приводится к строчным. Методы .get и .header же осуществляют приведение к строчным(маленьким) под капотом
        // // const deviceIp = req.ip || 'unknown ip';
        // const deviceIp = req.ip || req.headers['x-forwarded-for']?.toString() || 'unknown ip';
        // const deviceId = UUIDGeneratorUtil.generateUUID();
        //
        // // создаем пару токенов
        // const tokensPair = await this.jwtTokenProvider.generatePairOfTokens({
        //     userId: userId,
        //     deviceId: deviceId,
        // });
        // // // 1. Сначала рассчитываем временную метку для токенов и сессии
        // // // (или подготавливаем пары дат из JwtTokenProvider)
        // // const tokensPair = await this.jwtTokenProvider.generatePairOfTokens({
        // //     userId: userId,
        // //     deviceUUID: deviceUUID,
        // // });
        //
        // // создаем сессию
        // const session = this.SessionModel.createInstance({
        //     userId: userId,
        //     deviceName: deviceName,
        //     deviceIp: deviceIp,
        //     issuedAt: tokensPair.issuedAt,
        //     expiresAt: tokensPair.expiresAt,
        //     deviceUUID: deviceId,
        // });
        //
        // // сохраняем
        // await this.sessionsCommandRepository.save(session);
        //
        //
        // return {
        //     accessToken: tokensPair.accessToken,
        //     refreshToken: tokensPair.refreshToken,
        //     issuedAt: tokensPair.issuedAt,
        //     expiresAt: tokensPair.expiresAt,
        // };

        return await this.sessionsCommandRepository.toTestQuery();
    }
}
