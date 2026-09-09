export type UserAccessTokenContextDto = {
    userId: string;
};



// Эта запись называется Mapped Type (сопоставленный или отображаемый тип).
// По сути, это функция для типов: она принимает один тип данных, "пробегается"
// по всем его полям и на выходе выдает измененный тип.
export type Nullable<T> = { [P in keyof T]: T[P] | null };
