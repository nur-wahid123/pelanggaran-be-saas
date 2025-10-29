import { RoleEnum } from 'src/commons/enums/role.enum';

export interface JwtPayload {
  username: string;
  sub: number;
  role: RoleEnum;
  school_id: number;
  email: string;
  is_demo: boolean;
  start_date: string;
  image: number;
}
