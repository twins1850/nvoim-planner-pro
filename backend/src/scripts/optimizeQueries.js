/**
 * Database Query Optimization Script
 * 
 * This script analyzes and optimizes MongoDB queries by:
 * 1. Creating necessary indexes
 * 2. Analyzing slow queries
 * 3. Suggesting query optimizations
 */

const mongoose = require('mongoose');
const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/english_conversation_app';

// Connect to MongoDB
async function connectToMongoDB() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Connected to MongoDB successfully');
    return mongoose.connection.db;
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    process.exit(1);
  }
}

// Create indexes for common query patterns
async function createIndexes(db) {
  console.log('Creating indexes for common query patterns...');
  
  const indexOperations = [
    // User collection indexes
    {
      collection: 'users',
      indexes: [
        { key: { email: 1 }, name: 'email_index', unique: true },
        { key: { 'profile.name': 1 }, name: 'name_index' },
        { key: { role: 1 }, name: 'role_index' },
        { key: { 'profile.assignedPlanner': 1 }, name: 'assigned_planner_index' }
      ]
    },
    
    // Lesson collection indexes
    {
      collection: 'lessons',
      indexes: [
        { key: { plannerId: 1, lessonDate: -1 }, name: 'planner_date_index' },
        { key: { studentId: 1, lessonDate: -1 }, name: 'student_date_index' },
        { key: { status: 1 }, name: 'status_index' },
        { key: { createdAt: -1 }, name: 'created_at_index' }
      ]
    },
    
    // Homework collection indexes
    {
      collection: 'homework',
      indexes: [
        { key: { plannerId: 1, createdAt: -1 }, name: 'planner_created_index' },
        { key: { studentIds: 1, dueDate: 1 }, name: 'student_due_index' },
        { key: { status: 1, scheduledSendTime: 1 }, name: 'status_schedule_index' },
        { key: { basedOnLessonId: 1 }, name: 'lesson_index' }
      ]
    },
    
    // HomeworkSubmission collection indexes
    {
      collection: 'homeworksubmissions',
      indexes: [
        { key: { homeworkId: 1, studentId: 1 }, name: 'homework_student_index', unique: true },
        { key: { studentId: 1, submittedAt: -1 }, name: 'student_submitted_index' },
        { key: { status: 1 }, name: 'status_index' }
      ]
    },
    
    // Feedback collection indexes
    {
      collection: 'feedback',
      indexes: [
        { key: { submissionId: 1 }, name: 'submission_index', unique: true },
        { key: { studentId: 1, createdAt: -1 }, name: 'student_created_index' },
        { key: { plannerId: 1, createdAt: -1 }, name: 'planner_created_index' }
      ]
    },
    
    // Notification collection indexes
    {
      collection: 'notifications',
      indexes: [
        { key: { userId: 1, createdAt: -1 }, name: 'user_created_index' },
        { key: { type: 1, status: 1 }, name: 'type_status_index' }
      ]
    },
    
    // StudentProgress collection indexes
    {
      collection: 'studentprogress',
      indexes: [
        { key: { studentId: 1 }, name: 'student_index', unique: true },
        { key: { updatedAt: -1 }, name: 'updated_at_index' }
      ]
    },
    
    // ApiUsage collection indexes
    {
      collection: 'apiusage',
      indexes: [
        { key: { plannerId: 1, date: -1 }, name: 'planner_date_index' },
        { key: { serviceType: 1, date: -1 }, name: 'service_date_index' }
      ]
    }
  ];
  
  for (const op of indexOperations) {
    const collection = db.collection(op.collection);
    console.log(`Creating indexes for ${op.collection}...`);
    
    for (const index of op.indexes) {
      try {
        await collection.createIndex(index.key, { 
          name: index.name, 
          unique: index.unique || false,
          background: true
        });
        console.log(`  - Created index ${index.name} on ${op.collection}`);
      } catch (error) {
        if (error.code === 85) { // Index already exists
          console.log(`  - Index ${index.name} already exists on ${op.collection}`);
        } else {
          console.error(`  - Failed to create index ${index.name} on ${op.collection}:`, error);
        }
      }
    }
  }
  
  console.log('Index creation completed');
}

// Analyze slow queries from MongoDB logs
async function analyzeSlowQueries(db) {
  console.log('Analyzing slow queries...');
  
  try {
    // Enable profiling for slow queries (threshold: 100ms)
    await db.command({ profile: 1, slowms: 100 });
    console.log('Profiling enabled for queries slower than 100ms');
    
    // Get current profiling data
    const profilerData = await db.collection('system.profile').find({}).toArray();
    
    if (profilerData.length === 0) {
      console.log('No slow queries found in the profiler');
      return;
    }
    
    console.log(`Found ${profilerData.length} slow queries`);
    
    // Analyze and suggest optimizations
    const optimizationSuggestions = [];
    
    for (const query of profilerData) {
      if (query.op === 'query' || query.op === 'find') {
        const collection = query.ns.split('.')[1];
        const queryShape = query.query || query.command.filter;
        const executionTime = query.millis;
        const suggestion = {
          collection,
          query: JSON.stringify(queryShape),
          executionTime,
          suggestion: ''
        };
        
        // Check if query uses an index
        if (query.planSummary && query.planSummary.includes('COLLSCAN')) {
          // Collection scan detected - suggest an index
          const fields = Object.keys(queryShape).filter(k => !k.startsWith('$'));
          if (fields.length > 0) {
            const indexFields = fields.map(f => `${f}: 1`).join(', ');
            suggestion.suggestion = `Create an index on { ${indexFields} } to avoid collection scan`;
          }
        }
        
        // Check for sorting without an index
        if (query.command && query.command.sort) {
          const sortFields = Object.keys(query.command.sort);
          suggestion.suggestion += suggestion.suggestion ? '\n' : '';
          suggestion.suggestion += `Consider adding an index that includes sort fields: { ${sortFields.join(', ')} }`;
        }
        
        // Check for high execution time
        if (executionTime > 500) {
          suggestion.suggestion += suggestion.suggestion ? '\n' : '';
          suggestion.suggestion += 'Query is very slow. Consider restructuring data or adding compound indexes';
        }
        
        optimizationSuggestions.push(suggestion);
      }
    }
    
    // Output suggestions
    console.log('\nQuery Optimization Suggestions:');
    optimizationSuggestions.forEach((s, i) => {
      console.log(`\n[${i + 1}] Collection: ${s.collection}`);
      console.log(`    Query: ${s.query}`);
      console.log(`    Execution Time: ${s.executionTime}ms`);
      console.log(`    Suggestion: ${s.suggestion || 'No specific optimization needed'}`);
    });
    
    // Save suggestions to file
    const outputPath = path.join(__dirname, 'query_optimization_suggestions.json');
    fs.writeFileSync(outputPath, JSON.stringify(optimizationSuggestions, null, 2));
    console.log(`\nSuggestions saved to ${outputPath}`);
    
  } catch (error) {
    console.error('Error analyzing slow queries:', error);
  } finally {
    // Disable profiling
    try {
      await db.command({ profile: 0 });
      console.log('Profiling disabled');
    } catch (err) {
      console.error('Error disabling profiling:', err);
    }
  }
}

// Optimize specific common queries
async function optimizeCommonQueries() {
  console.log('\nOptimizing common query patterns in code...');
  
  const optimizations = [
    {
      description: 'Use projection to limit fields returned',
      example: `
// Before
const user = await User.findById(userId);

// After
const user = await User.findById(userId).select('email profile.name role');
      `
    },
    {
      description: 'Use lean() for read-only operations',
      example: `
// Before
const lessons = await Lesson.find({ plannerId });

// After
const lessons = await Lesson.find({ plannerId }).lean();
      `
    },
    {
      description: 'Use countDocuments() instead of count()',
      example: `
// Before
const count = await Submission.count({ status: 'pending' });

// After
const count = await Submission.countDocuments({ status: 'pending' });
      `
    },
    {
      description: 'Use aggregation for complex data transformations',
      example: `
// Before
const submissions = await HomeworkSubmission.find({ plannerId });
const submissionData = await Promise.all(submissions.map(async (sub) => {
  const student = await User.findById(sub.studentId);
  const homework = await Homework.findById(sub.homeworkId);
  return {
    id: sub._id,
    studentName: student.profile.name,
    homeworkTitle: homework.title,
    // ...other fields
  };
}));

// After
const submissionData = await HomeworkSubmission.aggregate([
  { $match: { plannerId: mongoose.Types.ObjectId(plannerId) } },
  { $lookup: {
      from: 'users',
      localField: 'studentId',
      foreignField: '_id',
      as: 'student'
    }
  },
  { $lookup: {
      from: 'homework',
      localField: 'homeworkId',
      foreignField: '_id',
      as: 'homework'
    }
  },
  { $unwind: '$student' },
  { $unwind: '$homework' },
  { $project: {
      id: '$_id',
      studentName: '$student.profile.name',
      homeworkTitle: '$homework.title',
      // ...other fields
    }
  }
]);
      `
    },
    {
      description: 'Use pagination to limit result size',
      example: `
// Before
const allLessons = await Lesson.find({ plannerId });

// After
const page = req.query.page || 1;
const limit = req.query.limit || 20;
const skip = (page - 1) * limit;

const lessons = await Lesson.find({ plannerId })
  .sort({ lessonDate: -1 })
  .skip(skip)
  .limit(limit);

const total = await Lesson.countDocuments({ plannerId });
const totalPages = Math.ceil(total / limit);
      `
    }
  ];
  
  optimizations.forEach((opt, i) => {
    console.log(`\n[${i + 1}] ${opt.description}`);
    console.log(opt.example);
  });
  
  // Save optimizations to file
  const outputPath = path.join(__dirname, 'query_pattern_optimizations.txt');
  const content = optimizations.map((opt, i) => {
    return `[${i + 1}] ${opt.description}\n${opt.example}\n`;
  }).join('\n');
  
  fs.writeFileSync(outputPath, content);
  console.log(`\nQuery pattern optimizations saved to ${outputPath}`);
}

// Main function
async function main() {
  console.log('Database Query Optimization Script');
  console.log('=================================\n');
  
  const db = await connectToMongoDB();
  
  // Create indexes
  await createIndexes(db);
  
  // Analyze slow queries
  await analyzeSlowQueries(db);
  
  // Optimize common queries
  await optimizeCommonQueries();
  
  console.log('\nOptimization process completed');
  
  // Close MongoDB connection
  await mongoose.connection.close();
  console.log('MongoDB connection closed');
}

// Run the script
main().catch(console.error);