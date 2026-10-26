import * as targetService from './target.service.js';
import { sendSuccess } from '../../shared/utils/response.js';

export async function listTargets(req, res, next) {
  try {
    const targets = await targetService.listTargets(req.user._id);
    return sendSuccess(res, { targets }, 'Targets retrieved successfully');
  } catch (error) {
    next(error);
  }
}

export async function createTarget(req, res, next) {
  try {
    const target = await targetService.createTarget(req.user._id, req.body);
    return sendSuccess(res, { target }, 'Target created successfully', 201);
  } catch (error) {
    next(error);
  }
}

export async function getTargetById(req, res, next) {
  try {
    const target = await targetService.getTargetById(req.user._id, req.params.id);
    return sendSuccess(res, { target }, 'Target retrieved successfully');
  } catch (error) {
    next(error);
  }
}

export async function updateTarget(req, res, next) {
  try {
    const target = await targetService.updateTarget(req.user._id, req.params.id, req.body);
    return sendSuccess(res, { target }, 'Target updated successfully');
  } catch (error) {
    next(error);
  }
}

export async function deleteTarget(req, res, next) {
  try {
    const result = await targetService.deleteTarget(req.user._id, req.params.id);
    return sendSuccess(res, result, 'Target deleted successfully');
  } catch (error) {
    next(error);
  }
}

export async function probeTargetHealth(req, res, next) {
  try {
    const result = await targetService.probeTargetHealth(req.user._id, req.params.id);
    return sendSuccess(res, result, 'Target health probe completed');
  } catch (error) {
    next(error);
  }
}

export default {
  listTargets,
  createTarget,
  getTargetById,
  updateTarget,
  deleteTarget,
  probeTargetHealth,
};
