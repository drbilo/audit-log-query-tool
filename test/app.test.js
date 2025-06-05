const { generateQueryString, exportLogsToCsv, ALL_AUDIT_LOG_FIELDS } = require('../src/app');

describe('generateQueryString', () => {
  test('builds query for Query Builder mode', () => {
    const query = generateQueryString({
      mode: 'queryBuilder',
      objectId: 'OBJ123',
      firstCount: '10',
      offset: '5',
      selectedFields: ['id', 'objectId']
    });
    const expected = `{
  allLogsV2ByObjectId (objectId:"OBJ123",
    first:10, offset:5) {
    nodes {
      id\n      objectId
    }
  }
}`;
    expect(query).toBe(expected);
  });

  test('builds query for User Lookup mode', () => {
    const query = generateQueryString({ mode: 'userLookup', userId: 'user123' });
    const expected = `{
  userById (id:"user123") {
    email\n    status\n    givenName\n    familyName\n    provider\n    createdAt
  }
}`;
    expect(query).toBe(expected);
  });
});

describe('exportLogsToCsv', () => {
  test('creates CSV with headers and rows', () => {
    const log1 = {
      id: 1,
      objectId: 'A',
      objectName: 'Name',
      objectType: 'Obj',
      action: 'create',
      timestamp: '2023-01-01',
      changedFields: { foo: 'bar' },
      previousFields: { x: 1 },
      userId: 'user1'
    };
    const log2 = {
      id: 2,
      objectId: 'B',
      objectName: 'Name2',
      objectType: 'Obj',
      action: 'delete',
      timestamp: '2023-01-02',
      changedFields: null,
      userId: 'user2'
    };

    const csv = exportLogsToCsv([log1, log2]);
    const rows = csv.trim().split('\n');
    const expectedHeader = ALL_AUDIT_LOG_FIELDS.map(h => `"${h}"`).join(',');
    expect(rows[0]).toBe(expectedHeader);
    expect(rows.length).toBe(3);

    const expectedRow1 = ALL_AUDIT_LOG_FIELDS.map(header => {
      let value = log1[header];
      if (value === null || value === undefined) {
        value = '';
      } else if (typeof value === 'object') {
        value = JSON.stringify(value);
      } else {
        value = String(value);
      }
      if (value.includes(',') || value.includes('"')) {
        value = `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    }).join(',');

    expect(rows[1]).toBe(expectedRow1);
  });
});
