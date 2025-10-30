export enum LogTypeEnum {
  LOGIN_ATTEMPT_FAILED = 'login-attempt-failed',
  LOGIN_ATTEMPT_SUCCESS = 'login-attempt-success',

  CREATE_STUDENT_SUCCESS = 'create-student-success',
  CREATE_STUDENT_FAILED = 'create-student-failed',
  UPDATE_STUDENT = 'update-student',
  DELETE_STUDENT = 'delete-student',

  CREATE_CLASS_FAILED = 'create-class-failed',
  CREATE_CLASS_SUCCESS = 'create-class-success',
  UPDATE_CLASS = 'update-class',
  DELETE_CLASS = 'delete-class',

  CREATE_VIOLATION_TYPE_SUCCESS = 'create-violation-type-success',
  CREATE_VIOLATION_TYPE_FAILED = 'create-violation-type-failed',
  UPDATE_VIOLATION_TYPE = 'update-violation-type',
  DELETE_VIOLATION_TYPE = 'delete-violation-type',

  CREATE_VIOLATION_SUCCESS = 'create-violation-success',
  CREATE_VIOLATION_FAILED = 'create-violation-failed',
  UPDATE_VIOLATION = 'update-violation',
  DELETE_VIOLATION = 'delete-violation',

  IMPORT_STUDENT = 'import-student',
  IMPORT_VIOLATION_TYPE = 'import-violation-type',
  IMPORT_VIOLATION = 'import-violation',

  EXPORT_VIOLATION_DATA = 'export-violation-data',

  EDIT_PASSWORD = 'edit-password',
  EDIT_SELF = 'edit-self',
  EDIT_SCHOOL_INFO = 'edit-school-info',

  DELETE_ALL_VIOLATION = 'delete-all-violation',
}
