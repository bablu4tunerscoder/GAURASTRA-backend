const User = require('../models/user');
const bcrypt = require('bcryptjs');
const { generateToken } = require('../offline_utils/jwt');



exports.registerUser = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ msg: 'User already exists with that email.' });
        }

        const salt = await bcrypt.genSalt(10);

        const hashedPassword = await bcrypt.hash(password, salt);

        user = new User({
            name,
            email,
            password: hashedPassword,
        });

        await user.save();

        res.status(201).json({
            msg: 'User registered successfully',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                password: password,
                role: user.role
            }
        });

    } catch (err) {
        console.error(err.message);

        if (err.name === 'ValidationError') {
            return res.status(400).json({ msg: err.message });
        }
        res.status(500).send('Server Error during registration');
    }
};



exports.loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        let user = await User.findOne({ email }).select('+password');
        if (!user) {
            return res.status(400).json({ msg: 'Invalid Credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Invalid Credentials' });
        }

        const payload = {
            user: {
                email: user.email,
                id: user.id,
                role: user.role
            }
        };

        const token = await generateToken(payload, '24h');

        res.json({
            token,
            data: {
                name:user.name,
                email:user.email,
                role:user.role,
                active:user.is_active
            },
            msg: 'Login successful',
            expiresIn: '24h'
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error during login');
    }
};

exports.getUserDetailsByEmail = async (req, res) => {
    try {
       
        const userEmail = req.params.email;

        
        const user = await User.findOne({ email: userEmail }).select('-password');
        
        if (!user) {
            return res.status(404).json({ msg: 'User not found with the provided email.' });
        }
        
        res.json({
            data: user,
            msg: 'Get details successful',
          
        });

    } catch (err) {
        console.error(err.message);
        if (err.name === 'CastError') {
             return res.status(400).send('Invalid email format in request.');
        }

        res.status(500).send('Server Error');
    }
};

exports.updatePassword = async (req, res) => {
    try {
        const { newPassword } = req.body;
        
        const userid = req.params.id;


        let user = await User.findById(userid).select('+password');
        if (!user) {
            return res.status(404).json({ msg: 'User not found.' });
        }

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        
        await user.save();

        res.json({ msg: 'Password updated successfully.' });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error during password update');
    }
};


exports.updateName = async (req, res) => {
    try {
         const userid = req.params.id;
        const { name } = req.body;
    
        if (!name) {
            return res.status(400).json({ msg: 'Please provide the new name.' });
        }

        let user = await User.findById(userid);
        if (!user) {
            return res.status(404).json({ msg: 'User not found.' });
        }

        if (name) user.name = name;

        await user.save();

        res.json({ 
            msg: 'Profile updated successfully.',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });

    } catch (err) {
        console.error(err.message);
        
        if (err.name === 'ValidationError') {
            return res.status(400).json({ msg: err.message });
        }
        res.status(500).send('Server Error during profile update');
    }
};


exports.deleteUser = async (req, res) => {
    try {
        const userId = req.params.id;
        const deletedUser = await User.findByIdAndDelete(userId);

        if (!deletedUser) {
            return res.status(404).json({ msg: 'User not found with the provided ID.' });
        }
        res.json({ 
            msg: 'User deleted successfully.',
            user:{
                id:deletedUser._id,
                email:deletedUser.email
            }
        });

    } catch (err) {
        console.error(err.message);
    
        if (err.kind === 'ObjectId') {
             return res.status(400).json({ msg: 'Invalid user ID format.' });
        }
        
        res.status(500).send('Server Error during user deletion');
    }
};

exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.find().select('-password');

        if (!users || users.length === 0) {
            return res.status(404).json({ msg: "No users found." });
        }

        res.json({
            msg: "Users fetched successfully.",
            total: users.length,
            users: users
        });

    } catch (err) {
        console.error(err.message);

        if (err.name === "ValidationError") {
            return res.status(400).json({ msg: err.message });
        }

        res.status(500).send("Server Error during fetching users");
    }
};
