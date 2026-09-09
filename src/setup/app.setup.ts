import { pipesSetup } from './pipes.setup';
import { INestApplication } from '@nestjs/common';
import { globalPrefixSetup } from './global-prefix.setup';
import { swaggerSetup } from './swagger.setup';
import cookieParser from 'cookie-parser';

export function appSetup(app: INestApplication) {
  app.use(cookieParser());
  pipesSetup(app);
  // globalPrefixSetup(app);
  swaggerSetup(app);
}
