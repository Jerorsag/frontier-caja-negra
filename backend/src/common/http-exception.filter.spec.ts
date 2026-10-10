import { BadRequestException, NotFoundException } from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';

describe('HttpExceptionFilter', () => {
  const filter = new HttpExceptionFilter();

  it('maps HttpException to its status and message', () => {
    const body = filter.toErrorResponse(
      new NotFoundException('Item not found'),
      '/items/1',
    );
    expect(body.statusCode).toBe(404);
    expect(body.error).toBe('NOT_FOUND');
    expect(body.message).toBe('Item not found');
    expect(body.path).toBe('/items/1');
  });

  it('keeps validation messages as an array', () => {
    const body = filter.toErrorResponse(
      new BadRequestException(['name must be a string']),
      '/items',
    );
    expect(body.statusCode).toBe(400);
    expect(body.message).toEqual(['name must be a string']);
  });

  it('hides internals of unknown errors behind a 500', () => {
    const body = filter.toErrorResponse(new Error('db password leaked'), '/x');
    expect(body.statusCode).toBe(500);
    expect(body.message).toBe('Internal server error');
  });
});
