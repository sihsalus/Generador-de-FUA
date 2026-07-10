import { afterEach, describe, expect, jest, test } from '@jest/globals';
import { NextFunction, Request, Response } from 'express';
import { authenticate } from './authentication';

function requestWithToken(token?: string): Request {
  return {
    get: jest.fn(() => token),
  } as unknown as Request;
}

function responseMock(): Response {
  const response = {
    status: jest.fn(),
    json: jest.fn(),
  };
  response.status.mockReturnValue(response);
  response.json.mockReturnValue(response);
  return response as unknown as Response;
}

describe('FUA generator authentication', () => {
  const originalToken = process.env.TOKEN;

  afterEach(() => {
    if (originalToken === undefined) {
      delete process.env.TOKEN;
    } else {
      process.env.TOKEN = originalToken;
    }
  });

  test('accepts the configured token', () => {
    process.env.TOKEN = 'expected-token';
    const response = responseMock();
    const next = jest.fn() as NextFunction;

    authenticate(requestWithToken('expected-token'), response, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(response.status).not.toHaveBeenCalled();
  });

  test('rejects a missing or incorrect token without calling next', () => {
    process.env.TOKEN = 'expected-token';
    const response = responseMock();
    const next = jest.fn() as NextFunction;

    authenticate(requestWithToken('wrong-token'), response, next);

    expect(response.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('fails closed when the server token is not configured', () => {
    delete process.env.TOKEN;
    const response = responseMock();
    const next = jest.fn() as NextFunction;

    authenticate(requestWithToken('any-token'), response, next);

    expect(response.status).toHaveBeenCalledWith(503);
    expect(next).not.toHaveBeenCalled();
  });
});
