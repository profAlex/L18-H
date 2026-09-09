import {CreateSessionDomainPayload} from "./payload/create-session.domain.payload";
import {Session} from "./session.entity";
import {UUIDGeneratorUtil} from "../../../core/uuid-generation/uuid.service";
import {UpdateSessionDomainDto} from "./dto/update-session.domain.dto";

describe('SessionEntity unit testing', () => {
    it('createInstance method test. should create new session entity with specified data extracted from dto object', async () => {
        const testDto:CreateSessionDomainPayload = {
            userId: 'some-id',
            deviceName: 'some-device-name',
            deviceIP: 'test-ip',
        }

        const spyOnUUIDEntity = jest.spyOn(UUIDGeneratorUtil, 'generateUUID').mockReturnValue('some-mock-uuid');
        const session = Session.createInstance(testDto);

        // session.userId = sessionPayload.userId;
        // session.deviceUUID = UUIDGeneratorUtil.generateUUID();
        // session.deviceName = sessionPayload.deviceName;
        // session.deviceIP = sessionPayload.deviceIP;
        //
        // session.issuedAt = new Date();
        // session.expiresAt = new Date(session.issuedAt.getTime() + refreshTokenLifeSpanMinutes*60*1000);
        // session.createdAt = new Date();
        // session.deletedAt = null;

        expect(session.userId).toBe(testDto.userId);
        expect(session.deviceUUID).toBe('some-mock-uuid');
        expect(session.deviceName).toBe(testDto.deviceName);
        expect(session.deviceIP).toBe(testDto.deviceIP);
        expect(session.issuedAt).toBeInstanceOf(Date);
        expect(session.expiresAt).toBeInstanceOf(Date);
        expect(session.createdAt).toBeInstanceOf(Date);
        expect(session.deletedAt).toBe(null);

        spyOnUUIDEntity.mockRestore();
    });


    it('makeDeleted method test. should create a date object on session.deletedAt property', async () => {
        const testDto:CreateSessionDomainPayload = {
            userId: 'some-id',
            deviceName: 'some-device-name',
            deviceIP: 'test-ip',
        }

        const spyOnUUIDEntity = jest.spyOn(UUIDGeneratorUtil, 'generateUUID').mockReturnValue('some-mock-uuid');
        const session = Session.createInstance(testDto);

        session.makeDeleted();

        expect(session.deletedAt).toBeInstanceOf(Date);

        spyOnUUIDEntity.mockRestore();
    });


    it('makeDeleted method test. should create a date object on session.deletedAt property', async () => {
        const testUpdateSessionDto: UpdateSessionDomainDto = {
            issuedAt: new Date(Date.now() + 5 * 60 * 1000),
            expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        }

        const testSessionDto:CreateSessionDomainPayload = {
            userId: 'some-id',
            deviceName: 'some-device-name',
            deviceIP: 'test-ip',
        }

        const spyOnUUIDEntity = jest.spyOn(UUIDGeneratorUtil, 'generateUUID').mockReturnValue('some-mock-uuid');
        const session = Session.createInstance(testSessionDto);

        session.updateSession(testUpdateSessionDto);

        expect(session.issuedAt).toBe(testUpdateSessionDto.issuedAt);
        expect(session.expiresAt).toBe(testUpdateSessionDto.expiresAt);

        spyOnUUIDEntity.mockRestore();

    });
});