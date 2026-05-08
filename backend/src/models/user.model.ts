import { model, Schema, type Document } from "mongoose";
import bcrypt from "bcryptjs";

export type UserRole = "ADMIN" | "USER";

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Email no valido"]
    },
    password: { type: String, required: true, minlength: 8 },
    role: { type: String, enum: ["ADMIN", "USER"], default: "USER" },
    active: { type: Boolean, default: true }
  },
  { timestamps: true }
);

userSchema.pre("save", async function hashPassword(next) {
  if (!this.isModified("password")) {
    return next();
  }

  try {
    this.password = await bcrypt.hash(this.password, 12);
    return next();
  } catch (error) {
    return next(error as Error);
  }
});

const User = model<IUser>("User", userSchema);

export default User;
