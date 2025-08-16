#!/usr/bin/env node

/**
 * GitHub Contribution Graph Manipulator
 * 
 * This script generates commits with custom dates to manipulate the GitHub contribution graph.
 * It creates a specified number of commits across different dates in the past.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  // Number of commits to generate
  totalCommits: 167,
  // Start date (in the past)
  startDate: new Date('2025-03-25'),
  // End date (usually today)
  endDate: new Date('2025-08-17'),
  // File to modify for each commit
  targetFile: 'contribution-data.md',
  // Commit message template
  commitMessage: 'Update contribution data',
  // Maximum commits per day (to make it look natural)
  maxCommitsPerDay: 4,
  // Days of week to prioritize (0 = Sunday, 6 = Saturday)
  // Higher numbers mean more commits on those days
  dayWeights: [1, 5, 5, 5, 5, 5, 1],
  // Distribution pattern: 'random', 'gradient', or 'pattern'
  distribution: 'gradient'
};

/**
 * Initialize the repository if needed
 */
function initializeRepo() {
  // Check if .git directory exists
  if (!fs.existsSync(path.join(process.cwd(), '.git'))) {
    console.log('Initializing Git repository...');
    execSync('git init');
    
    // Create initial commit
    if (!fs.existsSync(CONFIG.targetFile)) {
      fs.writeFileSync(CONFIG.targetFile, '# Contribution Data\n\nThis file tracks contribution data.\n');
      execSync(`git add ${CONFIG.targetFile}`);
      execSync('git commit -m "Initial commit"');
    }
  }
}

/**
 * Generate a random date between start and end dates
 */
function getRandomDate(start, end, distribution) {
  const startTime = start.getTime();
  const endTime = end.getTime();
  const timeRange = endTime - startTime;
  
  let randomTime;
  
  switch (distribution) {
    case 'gradient':
      // More commits in recent months
      const gradientFactor = Math.pow(Math.random(), 0.5); // Bias toward recent dates
      randomTime = endTime - gradientFactor * timeRange;
      break;
    case 'pattern':
      // Create a pattern (more commits on weekdays)
      randomTime = startTime + Math.random() * timeRange;
      const date = new Date(randomTime);
      const dayOfWeek = date.getDay();
      // Skip if the random weight is higher than the day's weight
      if (Math.random() > CONFIG.dayWeights[dayOfWeek] / 5) {
        return getRandomDate(start, end, distribution); // Try again
      }
      break;
    case 'random':
    default:
      // Completely random
      randomTime = startTime + Math.random() * timeRange;
  }
  
  return new Date(randomTime);
}

/**
 * Create a commit with a specific date
 */
function createCommitWithDate(date, index) {
  const dateString = date.toISOString();
  const content = `# Contribution Data\n\nLast updated: ${dateString}\nCommit number: ${index}\n\n${Math.random().toString(36).substring(2)}\n`;
  
  // Update the file
  fs.writeFileSync(CONFIG.targetFile, content);
  
  // Add and commit with the custom date
  execSync(`git add ${CONFIG.targetFile}`);
  
  // Set environment variables for commit date
  const env = {
    GIT_AUTHOR_DATE: dateString,
    GIT_COMMITTER_DATE: dateString,
    ...process.env
  };
  
  // Create the commit with the custom date
  execSync(`git commit -m "${CONFIG.commitMessage} #${index}"`, { env });
  
  return dateString;
}

/**
 * Main function to generate commits
 */
function generateCommits() {
  console.log(`Generating ${CONFIG.totalCommits} commits between ${CONFIG.startDate.toDateString()} and ${CONFIG.endDate.toDateString()}...`);
  
  // Initialize repository if needed
  initializeRepo();
  
  // Track dates to avoid too many commits on the same day
  const commitsByDate = {};
  
  // Generate commits
  for (let i = 1; i <= CONFIG.totalCommits; i++) {
    let commitDate;
    let dateKey;
    let attempts = 0;
    
    // Try to find a date that doesn't have too many commits already
    do {
      commitDate = getRandomDate(CONFIG.startDate, CONFIG.endDate, CONFIG.distribution);
      dateKey = commitDate.toDateString();
      commitsByDate[dateKey] = commitsByDate[dateKey] || 0;
      attempts++;
      
      // Avoid infinite loop
      if (attempts > 100) {
        console.log('Too many attempts to find a suitable date. Consider increasing the date range or reducing total commits.');
        break;
      }
    } while (commitsByDate[dateKey] >= CONFIG.maxCommitsPerDay);
    
    // Create the commit
    const commitDateString = createCommitWithDate(commitDate, i);
    commitsByDate[dateKey]++;
    
    if (i % 10 === 0 || i === CONFIG.totalCommits) {
      console.log(`Created commit ${i}/${CONFIG.totalCommits} with date: ${commitDateString}`);
    }
  }
  
  console.log('\nCommit generation complete!');
  console.log('\nTo push these commits to GitHub:');
  console.log('1. Create a new repository on GitHub');
  console.log('2. Add the remote: git remote add origin <your-repo-url>');
  console.log('3. Push the commits: git push -u origin master (or main)');
}

// Run the script
generateCommits();
