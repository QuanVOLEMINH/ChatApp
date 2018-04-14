const mongo = require('mongodb').MongoClient;
const client = require('socket.io').listen(4000).sockets;
const dbConfig = require('./dbconfig');
// Connection URL
const url = dbConfig.dbUrl;

// Database Name
const dbName = dbConfig.dbName;

// Collection Name;
const collectionName = dbConfig.collectionName;

// Use connect method to connect to the server
mongo.connect(url, function (err, db) {
    if (err) throw (err);

    const database = db.db(dbName);
    console.log("Connected successfully to server");

    // Connect to socketio
    client.on('connection', function (socket) {
        let chat = database.collection(collectionName);

        // Create function to send status
        const sendStatus = function (s) {
            socket.emit('status', s);
        };

        // Get chats from mongo collection
        chat.find().limit(100).sort({ _id: 1 }).toArray(function (err, result) {
            if (err) throw (err);

            // Emit the messages
            socket.emit('output', result);
        });

        // Handle input events
        socket.on('input', function (data) {
            let name = data.name;
            let message = data.message;
            let date = data.date;

            // Check for name and message
            if (name == '' || message == '') {
                sendStatus('Please enter a name and a message');
            } else {
                // Insert message
                chat.insert({ name: name, message: message, date: date }, function () {
                    // broadcast
                    client.emit('output', [data]);

                    // Send status object
                    sendStatus({
                        message: 'Message sent!',
                        clear: true
                    });
                });
            }
        });

        // Handle clear
        socket.on('clear', data => {
            // Remove all chats from collection
            chat.remove({}, () => {
                socket.emit('cleared');
            });
        })
    });
});
