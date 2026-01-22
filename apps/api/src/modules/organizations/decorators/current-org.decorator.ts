import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface CurrentOrgData {
  id: string;
  name: string;
  slug: string;
  role: string;
}

export const CurrentOrg = createParamDecorator(
  (data: keyof CurrentOrgData | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const org = request.organization as CurrentOrgData;

    return data ? org?.[data] : org;
  },
);
