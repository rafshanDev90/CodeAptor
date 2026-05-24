import catchAsync from '../utils/catchAsync.js';
import userService from '../services/user.service.js';

const userController = {
  createUser: catchAsync(async (req, res) => {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ status: 'fail', message: 'Name, email, and password are required' });
    }
    const user = await userService.createUser({ name, email, password, role });
    res.status(201).json({ status: 'success', data: { user } });
  }),

  getUser: catchAsync(async (req, res) => {
    const user = await userService.getUserById(req.params.id);
    res.status(200).json({ status: 'success', data: { user } });
  }),

  getAllUsers: catchAsync(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const result = await userService.getAllUsers(page, limit);
    res.status(200).json({ status: 'success', data: result });
  }),

  updateUser: catchAsync(async (req, res) => {
    const user = await userService.updateUser(req.params.id, req.body);
    res.status(200).json({ status: 'success', data: { user } });
  }),

  deleteUser: catchAsync(async (req, res) => {
    const result = await userService.deleteUser(req.params.id);
    res.status(200).json({ status: 'success', data: result });
  }),
};

export default userController;
