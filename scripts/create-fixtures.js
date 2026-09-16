#!/usr/bin/env node
const { writeFile } = require("fs").promises;
const ExcelJS = require("exceljs");

// Create a simple test Excel file
async function createTestExcel() {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Test Sheet");

  // Add headers
  worksheet.addRow(["Customer Name", "Phone Number", "City"]);

  // Add test data with repetitions
  worksheet.addRow(["John Doe", "555-1234", "New York"]);
  worksheet.addRow(["Jane Smith", "555-5678", "Los Angeles"]);
  worksheet.addRow(["Bob Johnson", "555-1234", "Chicago"]); // Same phone as John
  worksheet.addRow(["Alice Brown", "555-9999", "New York"]);
  worksheet.addRow(["Charlie Wilson", "555-1234", "Houston"]); // Same phone as John & Bob

  // Write to file
  await workbook.xlsx.writeFile("e2e/fixtures/test-simple.xlsx");
  console.log("Created test-simple.xlsx");
}

// Create another test with more complex data
async function createTestExcelComplex() {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Data");

  // Add headers
  worksheet.addRow(["Product", "Category", "Price", "Quantity"]);

  // Add test data
  worksheet.addRow(["Laptop", "Electronics", 999.99, 5]);
  worksheet.addRow(["Mouse", "Electronics", 29.99, 50]);
  worksheet.addRow(["Keyboard", "Electronics", 79.99, 30]);
  worksheet.addRow(["Monitor", "Electronics", 299.99, 15]);
  worksheet.addRow(["Desk", "Furniture", 199.99, 8]);
  worksheet.addRow(["Chair", "Furniture", 89.99, 25]);
  worksheet.addRow(["Laptop", "Electronics", 899.99, 3]); // Same product
  worksheet.addRow(["Mouse", "Electronics", 24.99, 40]); // Same product
  worksheet.addRow(["Book", "Education", 19.99, 100]);
  worksheet.addRow(["Pen", "Education", 2.99, 200]);

  // Write to file
  await workbook.xlsx.writeFile("e2e/fixtures/test-complex.xlsx");
  console.log("Created test-complex.xlsx");
}

// Create a test file with edge cases
async function createTestExcelEdgeCases() {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Edge Cases");

  // Add headers
  worksheet.addRow(["ID", "Value", "Notes"]);

  // Add test data with edge cases
  worksheet.addRow([1, "apple", ""]);
  worksheet.addRow([2, "banana", ""]);
  worksheet.addRow([3, "apple", ""]); // Duplicate
  worksheet.addRow([4, "", ""]); // Empty value
  worksheet.addRow([5, "orange", ""]);
  worksheet.addRow([6, "apple", ""]); // Duplicate
  worksheet.addRow([7, " ", ""]); // Whitespace only
  worksheet.addRow([8, "  apple  ", ""]); // Whitespace around
  worksheet.addRow([9, "grape", ""]);
  worksheet.addRow([10, "APPLE", ""]); // Different case

  // Write to file
  await workbook.xlsx.writeFile("e2e/fixtures/test-edge-cases.xlsx");
  console.log("Created test-edge-cases.xlsx");
}

// Run all fixture creation
async function createAllFixtures() {
  try {
    await createTestExcel();
    await createTestExcelComplex();
    await createTestExcelEdgeCases();
    console.log("All fixtures created successfully!");
  } catch (error) {
    console.error("Error creating fixtures:", error);
    process.exit(1);
  }
}

createAllFixtures();