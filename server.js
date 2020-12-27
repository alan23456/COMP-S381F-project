const MongoClient = require('mongodb').MongoClient;
const assert = require('assert');
const http = require('http');
const express = require('express');
const ObjectID = require('mongodb').ObjectID;
const session = require('cookie-session');
const bodyParser = require('body-parser');
const fs = require('fs');
const app = express();
const mongourl = 'mongodb+srv://lkii:peter188@cluster0.uepzz.mongodb.net/test1?retryWrites=true&w=majority';
const dbName = 'test1';
const SECRETKEY = 'ABC';


const client = new MongoClient(mongourl);

const findUser = (db, callback) => {
    let cursor = db.collection('user').find();
    cursor.toArray((err, docs) => {
        assert.equal(null, err);
        callback(docs[0]);
    })
}

const findRest = (db,callback) => {
    let cursor = db.collection('restaurant').find();
    cursor.toArray((err,docs) => {
        assert.equal(err,null);
        console.log(`findDocument: ${docs.length}`);
        callback(docs);
    });
}

const findRest1 = (db, criteria, callback) => {
    let cursor = db.collection('restaurant').find(criteria);
    console.log(`findDocument: ${JSON.stringify(criteria)}`);
    cursor.toArray((err,docs) => {
        assert.equal(err,null);
        console.log(`findDocument: ${docs.length}`);
        callback(docs);
    });
}

const findUserRestaurantDocument = (db,user,callback) => { //Find the restaurant Documents created by the user.

    let cursor = db.collection('restaurant').find( {"user_id": user} );
	console.log(`findDocument: ${JSON.stringify(user)}`);
    cursor.toArray((err, docs) => {
        assert.equal(null, err);
	console.log(`findDocument: ${docs.length}`);
        callback(docs);
    })
}
const handle_FindUserRestaurantDocument = (res,user) => {
    const client = new MongoClient(mongourl);
    client.connect((err) => {
        assert.equal(null, err);
        console.log("Connected successfully to server");
        const db = client.db(dbName);
	console.log("Finding Document");
        findUserRestaurantDocument(db,user,(docs) => {  

            client.close();
            console.log("Closed DB connection");
            res.status(200).render('user_details', {restaurant: docs});

        });
    });
}

const handle_Edit = (res,criteria) =>{
	const client = new MongoClient(mongourl);
	client.connect((err) => {
		assert.equal(null, err);
		console.log("Connected successfully to server");
		const db = client.db(dbName);
		/* use Document ID for query */
		let DOCID = {};
		DOCID['_id'] = ObjectID(criteria._id)
		let cursor = db.collection('restaurant').find(DOCID);
		cursor.toArray((err,docs) => {
				client.close();
				assert.equal(err,null);
				console.log("connecting to server");
				res.status(200).render('editpage',{restaurant: docs[0]});
			}) 
		});
}

const updateDocument =(criteria, updateDoc,callback) =>{
	const client = new MongoClient(mongourl);
    client.connect((err) => {
        assert.equal(null, err);
        console.log("Connected successfully to server");
        const db = client.db(dbName);
	
		 db.collection('restaurant').updateOne(criteria,
            {
                $set : updateDoc
            },
            (err, results) => {
                client.close();
                assert.equal(err, null);
                callback(results);
            }
		);
	});
}

const handle_Update = (req, res, criteria) => {

        var DOCID = {};
        DOCID['_id'] = ObjectID(req.body._id);
        var updateDoc = {};
console.log(req.body.name);
        updateDoc['name'] = req.body.name;
		updateDoc['borough'] = req.body.borough;
		updateDoc['cuisine'] = req.body.cuisine;
		updateDoc['photo_mimetype'] = req.body.photo_mimetype;
		updateDoc['address'] = {"building": req.body.building,
				         "coord": [req.body.GPSlon, req.body.GPSlat],
				         "street": req.body.street,
				         "zipcode": req.body.zipcode};
		updateDoc['owner'] = req.body.owner;
                updateDocument(DOCID, updateDoc, (results) => {
                	res.status(200).render('updatepage', {message: `Updated Restaurant: `+req.body.name
		})                
	})
}
const rateRestaurant =(criteria ,arrayUser,arrayScore, pushUser,pushScore,callback) =>{
	const client = new MongoClient(mongourl);

    client.connect((err) => {
        assert.equal(null, err);
        console.log("Connected successfully to server");
        const db = client.db(dbName);
	
		 db.collection('restaurant').update(criteria,
            {
                $push : {"grades.User": pushUser,"grades.score": pushScore} 
            },
            (err, results) => {
                client.close();
                assert.equal(err, null);
                callback(results);
            }
		);
	});
}
const handle_rating = (req, res, criteria) => {
	
	client.connect((err) => {
        assert.equal(null, err);
        console.log("Connected successfully to server");
        const db = client.db(dbName);
        let DOCID = {};
        DOCID['_id'] = ObjectID(req.body._id)
        findRest1(db, DOCID, (docs) => {
		client.close();
		console.log("Closed DB connection");
		var g= JSON.parse(JSON.stringify(docs[0].grades));
                rateRestaurant(DOCID,g.User,g.Score, req.body.username,req.body.score, (results) => {
                	res.status(200).render('rateInfo', {message: `Rated Restaurant: `+req.query.name+' successfully'})                
	})
	})
	})
}
const deleteDocument =(criteria,callback) =>{
	const client = new MongoClient(mongourl);
    client.connect((err) => {
        assert.equal(null, err);
        console.log("Connected successfully to server");
        const db = client.db(dbName);
	
		 db.collection('restaurant').deleteOne(criteria,
            (err, results) => {
                client.close();
                assert.equal(err, null);
                callback(results);
            }
		);
	});
}

var id =[];
var password=[];
var i = 0;

app.set('view engine', 'ejs');

app.use(session({
    name: 'loginSession',
    keys: [SECRETKEY]
}));


// support parsing of application/json type post data
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));

client.connect((err) => { // connect db
    assert.equal(null, err);
    console.log("Connected successfully to server");
    const db = client.db(dbName);
    findUser(db, (docs) => {
        
        console.log("Closed DB connection");
        for (doc of docs) {
            id[i] = doc.id;
            password[i] = doc.password;
	    i = i+1;
        }

    })
});

const insertDocument = (db, doc, callback) => {
    db.collection('restaurant').
    insert(doc, (err, results) => {
        assert.equal(err,null);
        console.log(`Inserted document(s): ${results.insertedCount}`);
        callback();
    });
}

app.get('/', (req, res) => { // render to the login page
    res.status(200).render('login', {});
});

app.get('/homepage', (req, res) => { // render to the home page
    if (!req.session.authenticated) { 
        res.redirect('/login');
    } 
    else {
    	const client = new MongoClient(mongourl);
	let param = req.query.s;
       
    	client.connect((err) => {
           assert.equal(null, err);
           console.log("Connected successfully to server");
           const db = client.db(dbName);
              findRest(db, (docs) => {
		      client.close();
		      console.log("Closed DB connection");
		      res.status(200).render('homepage',{name:req.session.username,restaurants: docs.length, restaurant: docs, search: param});
           
              });

    });
    } 
});

app.get('/details', (req,res) => {
    if (req.query._id) {
        let criteria = {};
        criteria['_id'] = req.query._id;

        const client = new MongoClient(mongourl);
        client.connect((err) => {
            assert.equal(null, err);
            console.log("Connected successfully to server");
            const db = client.db(dbName);
            let DOCID = {};
            DOCID['_id'] = ObjectID(criteria._id)
            findRest1(db, DOCID, (docs) => {
                client.close();
                console.log("Closed DB connection");
		
		res.status(200).render('details',{restaurant: docs[0]});
            });
        });
    } else {
        res.status(500).json({"error": "missing name"});
    }
})

app.post('/login', (req, res) => { // vaildate login information
    for (k = 0; k < id.length; k++) {
  	
    if (id[k] == req.body.name && password[k] == req.body.password ) {
        req.session.authenticated = true; 
        req.session.username = req.body.name; 	

    }
}
    res.redirect('/homepage');
});

app.get('/logout', (req, res) => { // handle logout
    req.session = null; // clear cookie-session
    res.redirect('/');
});

app.get('/createRestaurant', (req, res) => { // render createRestaurant page
    res.render('createRestaurant', {});
    
});

app.post('/create', (req, res) => { // Create rustaurant
    console.log("bor is " + req.body.borough);
    const DOC = [{"address": {"building": req.body.building,
                            "coord": [req.body.GPSlon, 
		                      req.body.GPSlat],
                            "street": req.body.street,
                            "zipcode": req.body.zipcode},
                 "borough": req.body.borough,
                 "cuisine": req.body.cuisine,
                 "grades": {"User":[],"score":[]},
                 "name": req.body.name,
		 "owner": req.body.owner,
                 "restaurant_id":req.body.id,
		 "user_id":req.session.username
    }];
    client.connect((err) => {
        assert.equal(null, err);
        console.log("Connected successfully to server");
        const db = client.db(dbName);
        insertDocument(db, DOC, () => {
            client.close();
            console.log("Closed DB connection");
        })
    });
    res.render('createRestaurant', {});

});

app.get('/user_details', (req, res) => { // render to the detail page (check users' document)
    if (!req.session.authenticated) { 
        res.redirect('/');
    } 
	else {
		handle_FindUserRestaurantDocument(res,req.session.username);
	}
});

app.get('/edit', (req, res) => { // render to the edit page
	if (!req.session.authenticated) { 
        	res.redirect('/login');
	} 
	else {
		handle_Edit(res, req.query);
	}
});

app.post('/update', (req, res) => { // render to the update page
	if (!req.session.authenticated) { 
        	res.redirect('/login');
    	} 
	else {
		handle_Update(req,res,req.query);
        }   
});

app.get('/delete', (req, res) => { // render to the delete page
    if (!req.session.authenticated) { 
        res.redirect('/login');
    } else {
		deleteDocument(req.query._id,(results) => {
        res.status(200).render('deletepage', {message: `Deleted the document`});
		});
    }
    
});


app.get('/ratepage', (req, res) => { // render to the rating page
    if (!req.session.authenticated) { 
        res.redirect('/login');
    } else {

	client.connect((err) => {
        assert.equal(null, err);
        console.log("Connected successfully to server");
        const db = client.db(dbName);
        let DOCID = {};
        DOCID['_id'] = ObjectID(req.query._id)
        findRest1(db, DOCID, (docs) => {
        client.close();
        console.log("Closed DB connection");
		var g= JSON.parse(JSON.stringify(docs[0].grades));
		console.log(g.User);
		if(g.User==null)
		res.status(200).render('ratepage', {restaurant:docs[0],username: req.session.username, name: req.query.name, _id:req.query._id});
		else{
			var rated= true;
			for(var i=0;i<g.User.length;i++){
				if(req.session.username==g.User[i])
				{
					rated=false;
					break;
				}
			}	
				if(!rated)
				{
					res.status(200).render('ratedWarning');
				}
			
				else
					{
						res.status(200).render('ratepage', {restaurant:docs[0],username: req.session.username, name: req.query.name, _id:req.query._id});
					}
		}
		}	
	
	)}
	)}
})

app.post('/rateInfo', (req, res) => { // render to the info page after rating
    if (!req.session.authenticated) { 
        res.redirect('/login');
    } else {
	
	handle_rating(req,res,req.query);
    };
    
});


app.get('/api/restaurant/name/:name', (req,res) => {
    if (req.params.name) {
        let criteria = {};
        criteria['name'] = req.params.name;
        const client = new MongoClient(mongourl);
        client.connect((err) => {
            assert.equal(null, err);
            console.log("Connected successfully to server");
            const db = client.db(dbName);
            findRest(db, criteria, (docs) => {
                client.close();
                console.log("Closed DB connection");
                res.status(200).json(docs);
            });
        });
    } else {
        res.status(500).json({"error": "missing name"});
    }
})

app.get('/api/restaurant/borough/:borough', (req,res) => {
    if (req.params.borough) {
        let criteria = {};
        criteria['borough'] = req.params.borough;
        const client = new MongoClient(mongourl);
        client.connect((err) => {
            assert.equal(null, err);
            console.log("Connected successfully to server");
            const db = client.db(dbName);
            findRest(db, criteria, (docs) => {
                client.close();
                console.log("Closed DB connection");
                res.status(200).json(docs);
            });
        });
    } else {
        res.status(500).json({"error": "missing borough"});
    }
})

app.get('/api/restaurant/cuisine/:cuisine', (req,res) => {
    if (req.params.cuisine) {
        let criteria = {};
        criteria['cuisine'] = req.params.cuisine;
        const client = new MongoClient(mongourl);
        client.connect((err) => {
            assert.equal(null, err);
            console.log("Connected successfully to server");
            const db = client.db(dbName);
            findRest(db, criteria, (docs) => {
                client.close();
                console.log("Closed DB connection");
                res.status(200).json(docs);
            });
        });
    } else {
        res.status(500).json({"error": "missing cuisine"});
    }
})

app.listen(process.env.PORT || 8099);
