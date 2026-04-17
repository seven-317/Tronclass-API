import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AttendanceApi } from './attendance.js';
import type { HttpClient } from '../core/http-client.js';
import * as fc from 'fast-check';

// Helper to generate valid ISO date strings
const validDateArbitrary = () => 
  fc.integer({ min: new Date('2020-01-01').getTime(), max: new Date('2030-12-31').getTime() })
    .map(timestamp => new Date(timestamp).toISOString());

/**
 * Bug Condition Exploration Test
 * 
 * **Validates: Requirements 1.1, 1.2, 1.3**
 * 
 * **Property 1: Bug Condition** - Number Code Returns Null from Radar Endpoint
 * 
 * This test verifies the bug condition: when getActiveRollcalls() is called,
 * it returns rollcalls with number_code as null or undefined because it uses
 * the /api/radar/rollcalls endpoint which doesn't contain the actual numeric code.
 * 
 * **CRITICAL**: This test encodes the EXPECTED behavior (number_code should be valid).
 * On UNFIXED code, this test MUST FAIL - failure confirms the bug exists.
 * When the fix is implemented, this test will PASS - confirming the bug is fixed.
 * 
 * **EXPECTED OUTCOME ON UNFIXED CODE**: Test FAILS (this is correct - it proves the bug exists)
 * **EXPECTED OUTCOME AFTER FIX**: Test PASSES (confirms bug is fixed)
 */
describe('AttendanceApi - Bug Condition Exploration', () => {
  let mockHttpClient: HttpClient;
  let attendanceApi: AttendanceApi;
  const baseUrl = 'https://example.tronclass.com';

  beforeEach(() => {
    // Create a mock HttpClient
    mockHttpClient = {
      getJson: vi.fn(),
      request: vi.fn(),
    } as unknown as HttpClient;

    attendanceApi = new AttendanceApi(mockHttpClient, baseUrl);
  });

  /**
   * Property-Based Test: Bug Condition - Number Code Returns Null from Radar Endpoint
   * 
   * This test uses property-based testing to verify that when active attendance
   * activities exist, getActiveRollcalls() should return rollcalls with valid
   * number_code values (not null or undefined).
   * 
   * On UNFIXED code: This test will FAIL because the current implementation
   * uses /api/radar/rollcalls which returns number_code: null
   * 
   * After FIX: This test will PASS because the implementation will use
   * /api/training/activities and extract number_code from option.answer
   */
  it('Property 1: getActiveRollcalls should return rollcalls with valid number_code when active attendance activities exist', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate arbitrary course IDs
        fc.array(fc.integer({ min: 1, max: 1000 }), { minLength: 1, maxLength: 3 }),
        // Generate arbitrary activity data that simulates the FIXED behavior
        fc.array(
          fc.record({
            id: fc.integer({ min: 1, max: 10000 }),
            type: fc.constant(16), // Attendance type
            status: fc.constant(1), // Active status
            allow_checkin: fc.constant(true), // Check-in allowed
            course_id: fc.integer({ min: 1, max: 1000 }),
            course_title: fc.string({ minLength: 5, maxLength: 50 }),
            created_by_name: fc.string({ minLength: 3, maxLength: 30 }),
            source: fc.string(),
            created_at: validDateArbitrary(),
            option: fc.record({
              answer: fc.string({ minLength: 4, maxLength: 6 }).map(s => s.replace(/\D/g, '').slice(0, 6) || '1234'),
            }),
          }),
          { minLength: 1, maxLength: 5 }
        ),
        async (courseIds, activities) => {
          // Mock the course list response
          const courses = courseIds.map(id => ({ id }));
          
          // Setup mock to return different responses based on URL
          vi.mocked(mockHttpClient.getJson).mockImplementation(async (url: string) => {
            if (url.includes('/api/my-courses')) {
              return { courses };
            } else if (url.includes('/api/training/activities')) {
              return { activities };
            }
            return {};
          });

          // Call the method under test
          const result = await attendanceApi.getActiveRollcalls();

          // EXPECTED BEHAVIOR (what SHOULD happen after fix):
          // All returned rollcalls should have valid number_code values
          // This assertion will FAIL on unfixed code (proving the bug exists)
          // and PASS after the fix is implemented
          
          expect(result).toBeInstanceOf(Array);
          expect(result.length).toBeGreaterThan(0);
          
          for (const rollcall of result) {
            // The number_code should NOT be null or undefined
            expect(rollcall.number_code).not.toBeNull();
            expect(rollcall.number_code).not.toBeUndefined();
            
            // The number_code should be a numeric string
            expect(rollcall.number_code).toMatch(/^\d+$/);
            
            // All returned rollcalls should be number-based
            expect(rollcall.is_number).toBe(true);
            
            // All returned rollcalls should be active
            expect(rollcall.status).toBe('on_call');
          }
        }
      ),
      {
        numRuns: 10, // Run 10 test cases to explore the property
        verbose: true,
      }
    );
  });

  /**
   * Concrete Test Case: Bug Condition with Specific Example
   * 
   * This test uses a concrete example to demonstrate the bug.
   * It simulates the exact scenario described in the bug report.
   */
  it('Concrete Example: getActiveRollcalls returns rollcalls with number_code extracted from activities', async () => {
    // Mock course list
    const courses = [{ id: 456 }];
    
    // Simulate the FIXED response from /api/training/activities
    const activities = [
      {
        id: 123,
        type: 16, // Attendance
        status: 1, // Active
        allow_checkin: true,
        course_id: 456,
        course_title: 'Introduction to Computer Science',
        created_by_name: 'Professor Smith',
        source: 'training',
        created_at: '2024-01-15T10:00:00Z',
        option: {
          answer: '5678', // Number code is here!
        },
      },
      {
        id: 789,
        type: 16, // Attendance
        status: 1, // Active
        allow_checkin: true,
        course_id: 456,
        course_title: 'Introduction to Computer Science',
        created_by_name: 'Professor Smith',
        source: 'training',
        created_at: '2024-01-15T10:05:00Z',
        option: {
          answer: '1234', // Number code is here!
        },
      },
    ];

    // Setup mock to return different responses based on URL
    vi.mocked(mockHttpClient.getJson).mockImplementation(async (url: string) => {
      if (url.includes('/api/my-courses')) {
        return { courses };
      } else if (url.includes('/api/training/activities')) {
        return { activities };
      }
      return {};
    });

    // Call the method under test
    const result = await attendanceApi.getActiveRollcalls();

    // EXPECTED BEHAVIOR (what SHOULD happen after fix):
    // The rollcalls should have valid number_code values like "5678", "1234", etc.
    
    expect(result).toHaveLength(2);
    
    // Verify first rollcall
    expect(result[0].number_code).toBe('5678');
    expect(result[0].number_code).toMatch(/^\d+$/);
    expect(result[0].is_number).toBe(true);
    expect(result[0].status).toBe('on_call');
    
    // Verify second rollcall
    expect(result[1].number_code).toBe('1234');
    expect(result[1].number_code).toMatch(/^\d+$/);
    expect(result[1].is_number).toBe(true);
    expect(result[1].status).toBe('on_call');
  });

  /**
   * Edge Case: Empty rollcalls array
   * 
   * This test verifies that when no active rollcalls exist,
   * the method returns an empty array (this behavior should be preserved).
   */
  it('Edge Case: getActiveRollcalls returns empty array when no active rollcalls exist', async () => {
    // Mock empty course list
    vi.mocked(mockHttpClient.getJson).mockImplementation(async (url: string) => {
      if (url.includes('/api/my-courses')) {
        return { courses: [] };
      } else if (url.includes('/api/training/activities')) {
        return { activities: [] };
      }
      return {};
    });

    const result = await attendanceApi.getActiveRollcalls();

    expect(result).toEqual([]);
  });
});

/**
 * Preservation Property Tests
 * 
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**
 * 
 * **Property 2: Preservation** - Non-getActiveRollcalls Method Behavior
 * 
 * These tests verify that other attendance API methods continue to work
 * correctly and use their existing endpoints and logic. This ensures that
 * the fix to getActiveRollcalls() does not introduce regressions in other
 * parts of the AttendanceApi class.
 * 
 * **IMPORTANT**: These tests run on UNFIXED code to observe baseline behavior.
 * After the fix is implemented, these same tests will verify no regressions occurred.
 * 
 * **EXPECTED OUTCOME ON UNFIXED CODE**: Tests PASS (confirms baseline behavior)
 * **EXPECTED OUTCOME AFTER FIX**: Tests PASS (confirms no regressions)
 */
describe('AttendanceApi - Preservation Property Tests', () => {
  let mockHttpClient: HttpClient;
  let attendanceApi: AttendanceApi;
  const baseUrl = 'https://example.tronclass.com';

  beforeEach(() => {
    // Create a mock HttpClient
    mockHttpClient = {
      getJson: vi.fn(),
      request: vi.fn(),
    } as unknown as HttpClient;

    attendanceApi = new AttendanceApi(mockHttpClient, baseUrl);
  });

  /**
   * Property 2.1: getCourseRollcalls Preservation
   * 
   * This test verifies that getCourseRollcalls(courseId) continues to:
   * - Use the /api/course/${courseId}/rollcalls endpoint
   * - Return expected rollcalls array
   * - Preserve the Rollcall[] data structure
   */
  describe('Property 2.1: getCourseRollcalls Preservation', () => {
    it('Property-Based Test: getCourseRollcalls uses correct endpoint and returns rollcalls', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate arbitrary course IDs
          fc.integer({ min: 1, max: 10000 }),
          // Generate arbitrary rollcalls arrays
          fc.array(
            fc.record({
              id: fc.integer({ min: 1, max: 10000 }),
              course_id: fc.integer({ min: 1, max: 10000 }),
              course_title: fc.string({ minLength: 5, maxLength: 50 }),
              created_by_name: fc.string({ minLength: 3, maxLength: 30 }),
              is_number: fc.boolean(),
              number_code: fc.oneof(
                fc.constant(null),
                fc.string({ minLength: 4, maxLength: 6 }).map(s => s.replace(/\D/g, '').slice(0, 4))
              ),
              status: fc.constantFrom('on_call', 'ended'),
              source: fc.string(),
              rollcall_time: validDateArbitrary(),
            }),
            { minLength: 0, maxLength: 10 }
          ),
          async (courseId, rollcalls) => {
            // Mock the expected behavior: getCourseRollcalls uses /api/course/${courseId}/rollcalls
            vi.mocked(mockHttpClient.getJson).mockResolvedValue({
              rollcalls: rollcalls,
            });

            // Call the method
            const result = await attendanceApi.getCourseRollcalls(courseId);

            // Verify the correct endpoint was called
            expect(mockHttpClient.getJson).toHaveBeenCalledWith(
              `${baseUrl}/api/course/${courseId}/rollcalls`
            );

            // Verify the result matches the expected structure
            expect(result).toEqual(rollcalls);
            expect(result).toBeInstanceOf(Array);

            // Verify each rollcall has the expected structure
            for (const rollcall of result) {
              expect(rollcall).toHaveProperty('id');
              expect(rollcall).toHaveProperty('course_id');
              expect(rollcall).toHaveProperty('course_title');
              expect(rollcall).toHaveProperty('created_by_name');
              expect(rollcall).toHaveProperty('is_number');
              expect(rollcall).toHaveProperty('status');
              expect(rollcall).toHaveProperty('source');
              expect(rollcall).toHaveProperty('rollcall_time');
            }
          }
        ),
        {
          numRuns: 20, // Run 20 test cases
          verbose: true,
        }
      );
    });

    it('Concrete Example: getCourseRollcalls returns rollcalls for a specific course', async () => {
      const courseId = 456;
      const expectedRollcalls = [
        {
          id: 123,
          course_id: 456,
          course_title: 'Introduction to Computer Science',
          created_by_name: 'Professor Smith',
          is_number: true,
          number_code: '5678',
          status: 'on_call',
          source: 'manual',
          rollcall_time: '2024-01-15T10:00:00Z',
        },
        {
          id: 789,
          course_id: 456,
          course_title: 'Introduction to Computer Science',
          created_by_name: 'Professor Smith',
          is_number: false,
          number_code: null,
          status: 'ended',
          source: 'manual',
          rollcall_time: '2024-01-14T10:00:00Z',
        },
      ];

      vi.mocked(mockHttpClient.getJson).mockResolvedValue({
        rollcalls: expectedRollcalls,
      });

      const result = await attendanceApi.getCourseRollcalls(courseId);

      // Verify correct endpoint
      expect(mockHttpClient.getJson).toHaveBeenCalledWith(
        `${baseUrl}/api/course/${courseId}/rollcalls`
      );

      // Verify result
      expect(result).toEqual(expectedRollcalls);
      expect(result).toHaveLength(2);
    });

    it('Edge Case: getCourseRollcalls returns empty array when no rollcalls exist', async () => {
      const courseId = 999;

      vi.mocked(mockHttpClient.getJson).mockResolvedValue({
        rollcalls: [],
      });

      const result = await attendanceApi.getCourseRollcalls(courseId);

      expect(result).toEqual([]);
    });
  });

  /**
   * Property 2.2: submitNumberRollcall Preservation
   * 
   * This test verifies that submitNumberRollcall(rollcallId, numberCode) continues to:
   * - Use the /api/rollcall/${rollcallId}/answer_number_rollcall endpoint
   * - Use PUT method
   * - Send number_code in request body
   * - Return expected result
   */
  describe('Property 2.2: submitNumberRollcall Preservation', () => {
    it('Property-Based Test: submitNumberRollcall uses correct endpoint and method', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate arbitrary rollcall IDs
          fc.integer({ min: 1, max: 10000 }),
          // Generate arbitrary number codes (4-6 digit strings)
          fc.string({ minLength: 4, maxLength: 6 }).map(s => s.replace(/\D/g, '').slice(0, 6) || '1234'),
          async (rollcallId, numberCode) => {
            // Mock successful response
            const mockResponse = {
              ok: true,
              status: 200,
              statusText: 'OK',
              json: vi.fn().mockResolvedValue({
                success: true,
                message: 'Rollcall submitted successfully',
              }),
            };

            vi.mocked(mockHttpClient.request).mockResolvedValue(mockResponse as any);

            // Call the method
            const result = await attendanceApi.submitNumberRollcall(rollcallId, numberCode);

            // Verify the correct endpoint was called
            expect(mockHttpClient.request).toHaveBeenCalledWith(
              `${baseUrl}/api/rollcall/${rollcallId}/answer_number_rollcall`,
              expect.objectContaining({
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ number_code: numberCode }),
              })
            );

            // Verify the result
            expect(result).toHaveProperty('success');
          }
        ),
        {
          numRuns: 20, // Run 20 test cases
          verbose: true,
        }
      );
    });

    it('Concrete Example: submitNumberRollcall submits number code successfully', async () => {
      const rollcallId = 123;
      const numberCode = '5678';

      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        json: vi.fn().mockResolvedValue({
          success: true,
          message: 'Rollcall submitted successfully',
        }),
      };

      vi.mocked(mockHttpClient.request).mockResolvedValue(mockResponse as any);

      const result = await attendanceApi.submitNumberRollcall(rollcallId, numberCode);

      // Verify correct endpoint and method
      expect(mockHttpClient.request).toHaveBeenCalledWith(
        `${baseUrl}/api/rollcall/${rollcallId}/answer_number_rollcall`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ number_code: numberCode }),
        }
      );

      // Verify result
      expect(result).toEqual({
        success: true,
        message: 'Rollcall submitted successfully',
      });
    });

    it('Edge Case: submitNumberRollcall handles API errors correctly', async () => {
      const rollcallId = 123;
      const numberCode = '5678';

      const mockResponse = {
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: vi.fn().mockResolvedValue('Invalid number code'),
      };

      vi.mocked(mockHttpClient.request).mockResolvedValue(mockResponse as any);

      // Verify that the method throws an error
      await expect(
        attendanceApi.submitNumberRollcall(rollcallId, numberCode)
      ).rejects.toThrow('Failed to submit rollcall: 400 Bad Request - Invalid number code');
    });
  });

  /**
   * Property 2.3: getStudentRollcalls Preservation
   * 
   * This test verifies that getStudentRollcalls(courseId) continues to:
   * - Use the /api/course/${courseId}/students_rollcalls endpoint
   * - Return expected student records array
   */
  describe('Property 2.3: getStudentRollcalls Preservation', () => {
    it('Property-Based Test: getStudentRollcalls uses correct endpoint and returns student records', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate arbitrary course IDs
          fc.integer({ min: 1, max: 10000 }),
          // Generate arbitrary student records arrays
          fc.array(
            fc.record({
              student_id: fc.integer({ min: 1, max: 100000 }),
              student_name: fc.string({ minLength: 3, maxLength: 30 }),
              attendance_count: fc.integer({ min: 0, max: 100 }),
              absence_count: fc.integer({ min: 0, max: 100 }),
            }),
            { minLength: 0, maxLength: 50 }
          ),
          async (courseId, students) => {
            // Mock the expected behavior: getStudentRollcalls uses /api/course/${courseId}/students_rollcalls
            vi.mocked(mockHttpClient.getJson).mockResolvedValue({
              students: students,
            });

            // Call the method
            const result = await attendanceApi.getStudentRollcalls(courseId);

            // Verify the correct endpoint was called
            expect(mockHttpClient.getJson).toHaveBeenCalledWith(
              `${baseUrl}/api/course/${courseId}/students_rollcalls`
            );

            // Verify the result matches the expected structure
            expect(result).toEqual(students);
            expect(result).toBeInstanceOf(Array);
          }
        ),
        {
          numRuns: 20, // Run 20 test cases
          verbose: true,
        }
      );
    });

    it('Concrete Example: getStudentRollcalls returns student records for a specific course', async () => {
      const courseId = 456;
      const expectedStudents = [
        {
          student_id: 1001,
          student_name: 'Alice Johnson',
          attendance_count: 15,
          absence_count: 2,
        },
        {
          student_id: 1002,
          student_name: 'Bob Smith',
          attendance_count: 14,
          absence_count: 3,
        },
      ];

      vi.mocked(mockHttpClient.getJson).mockResolvedValue({
        students: expectedStudents,
      });

      const result = await attendanceApi.getStudentRollcalls(courseId);

      // Verify correct endpoint
      expect(mockHttpClient.getJson).toHaveBeenCalledWith(
        `${baseUrl}/api/course/${courseId}/students_rollcalls`
      );

      // Verify result
      expect(result).toEqual(expectedStudents);
      expect(result).toHaveLength(2);
    });

    it('Edge Case: getStudentRollcalls returns empty array when no student records exist', async () => {
      const courseId = 999;

      vi.mocked(mockHttpClient.getJson).mockResolvedValue({
        students: [],
      });

      const result = await attendanceApi.getStudentRollcalls(courseId);

      expect(result).toEqual([]);
    });
  });

  /**
   * Property 2.4: Rollcall Data Structure Preservation
   * 
   * This test verifies that the Rollcall[] return type structure remains unchanged.
   * All fields should be present with correct types.
   */
  describe('Property 2.4: Rollcall Data Structure Preservation', () => {
    it('Property-Based Test: Rollcall structure has all required fields with correct types', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 10000 }),
          fc.array(
            fc.record({
              id: fc.integer({ min: 1, max: 10000 }),
              course_id: fc.integer({ min: 1, max: 10000 }),
              course_title: fc.string({ minLength: 5, maxLength: 50 }),
              created_by_name: fc.string({ minLength: 3, maxLength: 30 }),
              is_number: fc.boolean(),
              number_code: fc.oneof(
                fc.constant(null),
                fc.string({ minLength: 4, maxLength: 6 }).map(s => s.replace(/\D/g, '').slice(0, 4))
              ),
              status: fc.constantFrom('on_call', 'ended'),
              source: fc.string(),
              rollcall_time: validDateArbitrary(),
            }),
            { minLength: 1, maxLength: 10 }
          ),
          async (courseId, rollcalls) => {
            vi.mocked(mockHttpClient.getJson).mockResolvedValue({
              rollcalls: rollcalls,
            });

            const result = await attendanceApi.getCourseRollcalls(courseId);

            // Verify each rollcall has all required fields with correct types
            for (const rollcall of result) {
              // Required fields
              expect(typeof rollcall.id).toBe('number');
              expect(typeof rollcall.course_id).toBe('number');
              expect(typeof rollcall.course_title).toBe('string');
              expect(typeof rollcall.created_by_name).toBe('string');
              expect(typeof rollcall.is_number).toBe('boolean');
              expect(typeof rollcall.status).toBe('string');
              expect(typeof rollcall.source).toBe('string');
              expect(typeof rollcall.rollcall_time).toBe('string');

              // number_code can be null or string
              expect(
                rollcall.number_code === null || typeof rollcall.number_code === 'string'
              ).toBe(true);

              // Verify status is one of the expected values
              expect(['on_call', 'ended']).toContain(rollcall.status);
            }
          }
        ),
        {
          numRuns: 20, // Run 20 test cases
          verbose: true,
        }
      );
    });
  });
});
