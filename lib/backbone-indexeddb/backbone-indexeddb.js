// Generate four random hex digits.
function S4() {
   return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
};

// Generate a pseudo-GUID by concatenating random hexadecimal.
function guid() {
   return (S4()+S4()+"-"+S4()+"-"+S4()+"-"+S4()+"-"+S4()+S4()+S4());
};

window.indexedDB      = window.webkitIndexedDB;
window.IDBTransaction = window.webkitIDBTransaction;
window.IDBKeyRange    = window.webkitIDBKeyRange;

// Driver object
function Driver() {
};

// Driver Prototype
Driver.prototype = {
	
	// Performs all the migrations to reach the right version of the database
	migrate: function(db, migrations, version, options) {
		console.log("Starting migrations from " + version)
		this._migrate_next(db, migrations, version, options);
	},
	
	// Performs the next migrations. This method is private and should probably not be called.
	_migrate_next: function(db, migrations, version, options) {
		that = this
		var migration = migrations.shift()
		if( migration ) {
			if(!version || version < migration.version) {
				// We need to apply this migration
				var versionRequest = db.setVersion(migration.version );
				versionRequest.onsuccess = function ( e ) {
					migration.migrate(db, versionRequest, function() {
						// Migration successfully appliedn let's go to the next one!
						console.log("Migrated to " + migration.version)
						that._migrate_next(db, migrations, version, options)
					});
				};
			}
			else {
				// No need to apply this migration
				console.log("Skipping migration " + migration.version)
				this._migrate_next(db, migrations, version, options)
			}
		} else {
			// No more migration
			options.success();
		}
	},
	
	/* This is the main method. */
	execute: function(db, storeName, method, json, options) {
		switch(method) {
			case "create":
				this.write(db, storeName, json, options)
				break;
			case "read":
				if(json instanceof Array ) {
					this.query(db, storeName, options) // It's a collection
				} else {
					this.read(db, storeName, json, options) // It's a Model
				}
				break;
			case "update":
				this.write(db, storeName, json, options) // We may want to check that this is not a collection
				break;
			case "delete":
				this.delete(db, storeName, json, options) // We may want to check that this is not a collection
				break;
			default:
				// Hum what?
		}
	},

	// Writes the json to the storeName in db.
	// options are just success and error callbacks.
	write: function(db, storeName, json, options) {
		var writeTransaction = db.transaction([storeName], IDBTransaction.READ_WRITE, 0);
		var store = writeTransaction.objectStore( storeName );

	    if (!json.id) json.id = guid();
		
		var writeRequest = store.put(json, json.id);
		
		writeRequest.onerror = function ( e ) {
			options.error(e)
		};
		writeRequest.onsuccess = function ( e ) {
			options.success(json)
		};
	},
	
	// Reads from storeName in db with json.id if it's there of with any json.xxxx as long as xxx is an index in storeName 
	read: function(db, storeName, json, options) {
		var readTransaction = db.transaction([storeName], IDBTransaction.READ_ONLY);
		var store = readTransaction.objectStore(storeName);
		var getRequest = null
		if(json.id) {
			getRequest = store.get(json.id);
		} else {
			// We need to find which index we have
			_.each(store.indexNames, function(key, index) {
				index = store.index(key);
				if(json[index.keyPath]) {
					getRequest = index.get(json[index.keyPath]);
				}
			})
		}
		if(getRequest) {
			getRequest.onsuccess = function(event){
				if(event.target.result) {
					options.success(event.target.result)
				}
				else {
					options.error("Not Found")
				}
			};
		} else {
			options.error("Not Found"); // We couldn't even look for it, as we don't have enough data.
		}
	},
	
	// Deletes the json.id key and value in storeName from db.
	delete: function(db, storeName, json, options) {
		var deleteTransaction = db.transaction([storeName], IDBTransaction.READ_WRITE);
		var store = deleteTransaction.objectStore( storeName );
		var deleteRequest = store.delete(json.id );
		deleteRequest.onsuccess = function(event){
			options.success(null)
		};
		deleteRequest.onerror = function(event){
			options.error("Not Found")
		}
	},
	
	// Performs a query on storeName in db.
	// options may include :
	// - conditions : value of an index, or range for an index
	// - range : range for the primary key
	// - limit : max number of elements to be yielded
	// - offset : skipped items.
	// TODO : see if we could provide an options.stream where items would be yielded one by one. But that means we need to add that support into Backbone itself.
	query: function(db, storeName, options) {
		var elements = [];
		var skipped = 0;

		var queryTransaction = db.transaction([storeName], IDBTransaction.READ_ONLY);
		var readCursor = null;
		var store = queryTransaction.objectStore( storeName );

		if(options.conditions) {
			// We have a condition, we need to use it for the cursor
			_.each(store.indexNames, function(key, index) {
				index = store.index(key);
				if(options.conditions[index.keyPath] instanceof Array) {
					lower = options.conditions[index.keyPath][0] > options.conditions[index.keyPath][1] ? options.conditions[index.keyPath][1] : options.conditions[index.keyPath][0];
					upper = options.conditions[index.keyPath][0] > options.conditions[index.keyPath][1] ? options.conditions[index.keyPath][0] : options.conditions[index.keyPath][1];
					bounds = new IDBKeyRange.bound(lower, upper)
					if(options.conditions[index.keyPath][0] > options.conditions[index.keyPath][1]) {
						// Looks like we want the DESC order
						readCursor = index.openCursor(bounds, 2);
					}
					else {
						// We want ASC order
						readCursor = index.openCursor(bounds, 0);
					}
				} else if(options.conditions[index.keyPath]) {
					bounds = new IDBKeyRange.only(options.conditions[index.keyPath])
					readCursor = index.openCursor(bounds);
				}
			});
		} else {
			// No conditions, use the index
			if(options.range) {
				lower = options.range[0] > options.range[1] ? options.range[1] : options.range[0];
				upper = options.range[0] > options.range[1] ? options.range[0] : options.range[1];
				bounds = new IDBKeyRange.bound(lower, upper)
				if(options.range[0] > options.range[1]) {
					readCursor = store.openCursor(bounds, 2);
				}
				else {
					readCursor = store.openCursor(bounds, 0);
				}
			} else {
				readCursor = store.openCursor();
			}
		}

		// Setup a handler for the cursor’s `success` event:
		readCursor.onsuccess = function ( e ) {
			cursor = event.target.result;
			if( (cursor) && 
				(!options.limit || options.limit > elements.length)
			  ) {
				if(!options.offset || options.offset <= skipped ) {
					elements.push(event.target.result.value)
				} else {
					skipped ++;
				}
				cursor.continue();
			}
			else {
				options.success(elements)
			}
		};
	}
};


window.driver 		= new Driver();

// Keeps track of the connections
var Connections = {};

// ExecutionQueue object
function ExecutionQueue() {
	this.connection = null;
	this.started = false;
	this.stack = []
};

// ExecutionQueue Prototype
ExecutionQueue.prototype = {
	setConnection: function(connection) {
		this.connection = connection
	}	
}

Backbone.sync = function(method, object, options) {
	database = object.database
	if(!Connections[database.id]) {
		Connections[database.id] = new ExecutionQueue(); 
		_.extend(Connections[database.id], Backbone.Events); // Use the Backbone.Events
		Connections[database.id].bind("execute", function(message) { // Bind to the "execute" event
			if(this.started) {
				driver.execute(this.connection, message[1].storeName, message[0], message[1].toJSON(), message[2]) // Upon messages, we execute the query
			} else {
				this.stack.push(message)
			}
		}.bind(Connections[database.id]))
		Connections[database.id].bind("ready", function() { // Bind to the "execute" event
			this.started = true
			_.each(this.stack, function(message) {
				this.trigger("execute", message)
			}.bind(this))
		}.bind(Connections[database.id]))

		
		dbRequest = window.indexedDB.open(database.id, database.description || "");

		dbRequest.onsuccess = function ( e ) { 
			db = e.target.result;
			
			// Create an execution queue for this db connection
			Connections[database.id].setConnection(db); // Attach the connection ot the queue.
			
			
			if (db.version === _.last(database.migrations).version) {
				Connections[database.id].trigger("ready")
				Connections[database.id].trigger("execute", [method, object, options])
			} else if(db.version < _.last(database.migrations).version ) {
				driver.migrate(db, database.migrations, db.version, {
					success: function() {
						Connections[database.id].trigger("ready")
						Connections[database.id].trigger("execute", [method, object, options])
					}, 
					error: function() {
						options.error("Database not up to date. " + db.version + " expected was " + _.last(database.migrations).version)
					}
				});
			} else {
				options.error("Database version is greater than current code " + db.version + " expected was " +_.last(database.migrations).version)
			}
		};
		dbRequest.onerror   = function ( e ) { 
			// Failed to open the database
			options.error("Couldn't not connect to the database") // We probably need to show a better error log.
		};	
	
	} else {
		Connections[database.id].trigger("execute", [method, object, options])
	}


};