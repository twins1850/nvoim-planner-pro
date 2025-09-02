import mongoose, { Document, Schema } from 'mongoose';

// Report section interface
export interface IReportSection {
  type: 'performance' | 'lessons' | 'homework' | 'progress' | 'custom';
  title: string;
  dataFields: string[];
  chartType?: 'bar' | 'line' | 'pie' | 'radar';
  customQuery?: any;
}

// Report template interface
export interface IReportTemplate extends Document {
  name: string;
  description: string;
  sections: IReportSection[];
  createdBy: mongoose.Types.ObjectId;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Report section schema
const ReportSectionSchema = new Schema<IReportSection>({
  type: {
    type: String,
    enum: ['performance', 'lessons', 'homework', 'progress', 'custom'],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  dataFields: [{
    type: String,
    required: true
  }],
  chartType: {
    type: String,
    enum: ['bar', 'line', 'pie', 'radar']
  },
  customQuery: {
    type: Schema.Types.Mixed
  }
});

// Report template schema
const ReportTemplateSchema = new Schema<IReportTemplate>({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  sections: [ReportSectionSchema],
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isDefault: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes
ReportTemplateSchema.index({ createdBy: 1 });
ReportTemplateSchema.index({ isDefault: 1 });

export const ReportTemplate = mongoose.model<IReportTemplate>('ReportTemplate', ReportTemplateSchema);