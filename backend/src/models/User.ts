import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

// 사용자 인터페이스 정의
export interface IUser extends Document {
  email: string;
  password: string;
  role: 'planner' | 'student';
  profile: {
    name: string;
    phone?: string;
    avatar?: string;
    preferences: {
      language: string;
      notifications: boolean;
      timezone: string;
    };
    // 플래너 전용 필드
    managedStudents?: mongoose.Types.ObjectId[];
    // 학생 전용 필드
    assignedPlanner?: mongoose.Types.ObjectId;
    learningLevel?: string;
  };
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  
  // 메서드
  comparePassword(candidatePassword: string): Promise<boolean>;
}

// 사용자 스키마 정의
const UserSchema = new Schema<IUser>({
  email: {
    type: String,
    required: [true, '이메일은 필수입니다.'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, '유효한 이메일 주소를 입력해주세요.']
  },
  password: {
    type: String,
    required: [true, '비밀번호는 필수입니다.'],
    minlength: [6, '비밀번호는 최소 6자 이상이어야 합니다.']
  },
  role: {
    type: String,
    enum: ['planner', 'student'],
    required: [true, '사용자 역할은 필수입니다.']
  },
  profile: {
    name: {
      type: String,
      required: [true, '이름은 필수입니다.'],
      trim: true,
      maxlength: [50, '이름은 50자를 초과할 수 없습니다.']
    },
    phone: {
      type: String,
      trim: true,
      match: [/^[0-9-+().\s]+$/, '유효한 전화번호를 입력해주세요.']
    },
    avatar: {
      type: String,
      default: null
    },
    preferences: {
      language: {
        type: String,
        default: 'ko',
        enum: ['ko', 'en']
      },
      notifications: {
        type: Boolean,
        default: true
      },
      timezone: {
        type: String,
        default: 'Asia/Seoul'
      }
    },
    // 플래너 전용 필드
    managedStudents: [{
      type: Schema.Types.ObjectId,
      ref: 'User'
    }],
    // 학생 전용 필드
    assignedPlanner: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    learningLevel: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      default: 'beginner'
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLoginAt: {
    type: Date
  }
}, {
  timestamps: true, // createdAt, updatedAt 자동 생성
  toJSON: {
    transform: function(doc, ret) {
      delete (ret as any).password; // JSON 변환 시 비밀번호 제외
      return ret;
    }
  }
});

// 인덱스 설정
UserSchema.index({ email: 1 });
UserSchema.index({ role: 1, 'profile.assignedPlanner': 1 });
UserSchema.index({ 'profile.managedStudents': 1 });

// 비밀번호 해싱 미들웨어
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// 비밀번호 비교 메서드
UserSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

export const User = mongoose.model<IUser>('User', UserSchema);