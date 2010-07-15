/**
 * Global variables
 */
var diskDataTable; // zVM datatable containing disks
var networkDataTable; // zVM datatable containing networks

/**
 * Get the disk datatable
 * 
 * @param Nothing
 * @return Data table object
 */
function getDiskDataTable() {
	return diskDataTable;
}

/**
 * Set the disk datatable
 * 
 * @param table
 *            Data table object
 * @return Nothing
 */
function setDiskDataTable(table) {
	diskDataTable = table;
}

/**
 * Get the network datatable
 * 
 * @param Nothing
 * @return Data table object
 */
function getNetworkDataTable() {
	return networkDataTable;
}

/**
 * Set the network datatable
 * 
 * @param table
 *            Data table object
 * @return Nothing
 */
function setNetworkDataTable(table) {
	networkDataTable = table;
}

/**
 * Load user entry of a given node
 * 
 * @param data
 *            Data from HTTP request
 * @return Nothing
 */
function loadUserEntry(data) {
	var args = data.msg.split(';');

	// Get tab ID
	var ueDivId = args[0].replace('out=', '');
	// Get node
	var node = args[1].replace('node=', '');
	// Get node user entry
	var userEntry = data.rsp[0].split(node + ':');

	// Remove loader
	var loaderId = node + 'TabLoader';
	$('#' + loaderId).remove();

	var toggleLinkId = node + 'ToggleLink';
	$('#' + toggleLinkId).click(function() {
		// Get the text within this link
		var lnkText = $(this).text();

		// Toggle user entry division
		$('#' + node + 'UserEntry').toggle();
		// Toggle inventory division
		$('#' + node + 'Inventory').toggle();

		// Change text
		if (lnkText == 'Show user entry') {
			$(this).text('Show inventory');
		} else {
			$(this).text('Show user entry');
		}
	});

	// Put user entry into a list
	var fieldSet = $('<fieldset></fieldset>');
	var legend = $('<legend>User Entry</legend>');
	fieldSet.append(legend);

	var txtArea = $('<textarea></textarea>');
	for ( var i = 1; i < userEntry.length; i++) {
		userEntry[i] = jQuery.trim(userEntry[i]);
		txtArea.append(userEntry[i]);

		if (i < userEntry.length) {
			txtArea.append('\n');
		}
	}
	txtArea.attr('readonly', 'readonly');
	fieldSet.append(txtArea);

	/**
	 * Edit user entry
	 */
	txtArea.bind('dblclick', function(event) {
		txtArea.attr('readonly', '');
		txtArea.css( {
			'border-width' : '1px'
		});

		saveBtn.show();
		cancelBtn.show();
	});

	// Save button
	var saveBtn = createButton('Save');
	saveBtn.hide();
	saveBtn.bind('click', function(event) {
		// Show loader
		var statusId = node + 'StatusBar';
		var statusBarLoaderId = node + 'StatusBarLoader';
		$('#' + statusBarLoaderId).show();
		$('#' + statusId).show();

		// Replace user entry
		var newUserEntry = jQuery.trim(txtArea.val()) + '\n';

		// Replace user entry
		$.ajax( {
			url : 'lib/zCmd.php',
			dataType : 'json',
			data : {
				cmd : 'chvm',
				tgt : node,
				args : '--replacevs',
				att : newUserEntry,
				msg : node
			},

			success : updateZNodeStatus
		});

		// Increment node process and save it in a cookie
		incrementZNodeProcess(node);

		txtArea.attr('readonly', 'readonly');
		txtArea.css( {
			'border-width' : '0px'
		});

		// Stop this function from executing again
		// Unbind event
		$(this).unbind(event);
		$(this).hide();
		cancelBtn.hide();
	});

	// Cancel button
	var cancelBtn = createButton('Cancel');
	cancelBtn.hide();
	cancelBtn.bind('click', function(event) {
		txtArea.attr('readonly', 'readonly');
		txtArea.css( {
			'border-width' : '0px'
		});

		cancelBtn.hide();
		saveBtn.hide();
	});

	// Create info bar
	var infoBar = createInfoBar('Double click on the user entry to edit');

	// Append user entry into division
	$('#' + ueDivId).append(infoBar);
	$('#' + ueDivId).append(fieldSet);
	$('#' + ueDivId).append(saveBtn);
	$('#' + ueDivId).append(cancelBtn);
}

/**
 * Set a cookie to track the number of processes for a given node
 * 
 * @param node
 *            Node to set cookie for
 * @return Nothing
 */
function incrementZNodeProcess(node) {
	// Set cookie for number actions performed against node
	var actions = $.cookie(node + 'Processes');
	if (actions) {
		// One more process
		actions = parseInt(actions) + 1;
		$.cookie(node + 'Processes', actions);
	} else {
		$.cookie(node + 'Processes', 1);
	}
}

/**
 * Update the provision status bar
 * 
 * @param data
 *            Data returned from HTTP request
 * @return Nothing
 */
function updateProvisionStatus(data) {
	var rsp = data.rsp;
	var args = data.msg.split(';');

	// Get command invoked
	var cmd = args[0].replace('cmd=', '');
	// Get output ID
	var out2Id = args[1].replace('out=', '');

	var statBarId = 'zProvisionStatBar' + out2Id;
	var tabId = 'zvmProvisionTab' + out2Id;

	// The tab must be open in order to get these inputs

	// Get node name
	var node = $('#' + tabId + ' input[name=nodeName]').val();
	// Get userId
	var userId = $('#' + tabId + ' input[name=userId]').val();
	// Get hardware control point
	var hcp = $('#' + tabId + ' input[name=hcp]').val();
	// Get group
	var group = $('#' + tabId + ' input[name=group]').val();
	// Get user entry
	var userEntry = $('#' + tabId + ' textarea').val();
	// Get operating system
	var osImage = $('#' + tabId + ' input[name=os]').val();

	/**
	 * 2. Update /etc/hosts
	 */
	if (cmd == 'nodeadd') {

		// If no output, no errors occurred
		if (rsp.length) {
			$('#' + statBarId).append(
				'<p>(Error) Failed to create node definition</p>');
		} else {
			$('#' + statBarId).append(
				'<p>Node definition created for ' + node + '</p>');
		}

		// Update /etc/hosts
		$.ajax( {
			url : 'lib/cmd.php',
			dataType : 'json',
			data : {
				cmd : 'makehosts',
				tgt : '',
				args : '',
				msg : 'cmd=makehosts;out=' + out2Id
			},

			success : updateProvisionStatus
		});
	}

	/**
	 * 3. Update DNS
	 */
	else if (cmd == 'makehosts') {
		// If no output, no errors occurred
		if (rsp.length) {
			$('#' + statBarId).append(
				'<p>(Error) Failed to update /etc/hosts</p>');
		} else {
			$('#' + statBarId).append('<p>/etc/hosts updated</p>');
		}

		// Update DNS
		$.ajax( {
			url : 'lib/cmd.php',
			dataType : 'json',
			data : {
				cmd : 'makedns',
				tgt : '',
				args : '',
				msg : 'cmd=makedns;out=' + out2Id
			},

			success : updateProvisionStatus
		});
	}

	/**
	 * 4. Create user entry
	 */
	else if (cmd == 'makedns') {
		// Reset the number of tries
		$.cookie('tries4' + tabId, 0);

		// Separate output into lines
		var p = $('<p></p>');
		for ( var i = 0; i < rsp.length; i++) {
			if (rsp[i]) {
				p.append(rsp[i]);
				p.append('<br>');
			}
		}

		$('#' + statBarId).append(p);

		// Create user entry
		$.ajax( {
			url : 'lib/zCmd.php',
			dataType : 'json',
			data : {
				cmd : 'mkvm',
				tgt : node,
				args : '',
				att : userEntry,
				msg : 'cmd=mkvm;out=' + out2Id
			},

			success : updateProvisionStatus
		});
	}

	/**
	 * 5. Add disk and format disk
	 */
	else if (cmd == 'mkvm') {
		var failed = false;

		// Separate output into lines
		var p = $('<p></p>');
		for ( var i = 0; i < rsp.length; i++) {
			if (rsp[i]) {
				// Find the node name and insert a break before it
				rsp[i] = rsp[i].replace(new RegExp(node + ': ', 'g'), '<br>');

				p.append(rsp[i]);
				p.append('<br>');

				// If the call failed
				if (rsp[i].indexOf('Failed') > -1
					|| rsp[i].indexOf('Error') > -1) {
					failed = true;
				}
			}
		}

		$('#' + statBarId).append(p);

		// If the call failed
		if (failed) {
			// Try again (at least 2 times)
			var tries = parseInt($.cookie('tries4' + tabId));
			if (tries < 2) {
				$('#' + statBarId).append('<p>Trying again</p>');
				tries = tries + 1;

				// One more try
				$.cookie('tries4' + tabId, tries);

				// Create user entry
				$.ajax( {
					url : 'lib/zCmd.php',
					dataType : 'json',
					data : {
						cmd : 'mkvm',
						tgt : node,
						args : '',
						att : userEntry,
						msg : 'cmd=mkvm;out=' + out2Id
					},

					success : updateProvisionStatus
				});
			} else {
				// Failed - Do not continue
				var loaderId = 'zProvisionLoader' + out2Id;
				$('#' + loaderId).hide();
			}
		}
		// If there were no errors
		else {

			// Reset the number of tries
			$.cookie('tries4' + tabId, 0);

			// Set cookie for number of disks
			var diskRows = $('#' + tabId + ' table tr');
			$.cookie('zProvisionDisks2Add' + out2Id, diskRows.length);

			if (diskRows.length > 0) {
				for ( var i = 0; i < diskRows.length; i++) {
					var diskArgs = diskRows.eq(i).find('td');
					var type = diskArgs.eq(1).find('select').val();
					var address = diskArgs.eq(2).find('input').val();
					var size = diskArgs.eq(3).find('input').val();
					var pool = diskArgs.eq(4).find('input').val();
					var password = diskArgs.eq(5).find('input').val();

					// Add disk and format disk
					if (type == '3390') {
						$.ajax( {
							url : 'lib/cmd.php',
							dataType : 'json',
							data : {
								cmd : 'chvm',
								tgt : node,
								args : '--add3390;' + pool + ';' + address
									+ ';' + size + ';MR;' + password + ';'
									+ password + ';' + password,
								msg : 'cmd=chvm;out=' + out2Id
							},

							success : updateProvisionStatus
						});
					} else {
						// Virtual server created
						var loaderId = 'zProvisionLoader' + out2Id;
						$('#' + loaderId).hide();
					}
				}
			} else {
				// Virtual server created (no OS, no disks)
				var loaderId = 'zProvisionLoader' + out2Id;
				$('#' + loaderId).hide();
			}
		}
	}

	/**
	 * 6. Set the operating system for given node
	 */
	else if (cmd == 'chvm') {
		var failed = false;

		// Separate output into lines
		var p = $('<p></p>');
		for ( var i = 0; i < rsp.length; i++) {
			if (rsp[i]) {
				// Find the node name and insert a break before it
				rsp[i] = rsp[i].replace(new RegExp(node + ': ', 'g'), '<br>');

				p.append(rsp[i]);
				p.append('<br>');

				// If the call failed
				if (rsp[i].indexOf('Failed') > -1
					|| rsp[i].indexOf('Error') > -1) {
					failed = true;
				}
			}
		}

		$('#' + statBarId).append(p);

		// If the call failed
		if (failed) {
			// Try again (at least 2 times)
			var tries = parseInt($.cookie('tries4' + tabId));
			if (tries < 2) {
				$('#' + statBarId).append('<p>Trying again</p>');
				tries = tries + 1;

				// One more try
				$.cookie('tries4' + tabId, tries);

				// Set cookie for number of disks
				var diskRows = $('#' + tabId + ' table tr');
				$.cookie('zProvisionDisks2Add' + out2Id, diskRows.length);
				if (diskRows.length > 0) {
					for ( var i = 0; i < diskRows.length; i++) {
						var diskArgs = diskRows.eq(i).find('td');
						var address = diskArgs.eq(1).find('input').val();
						var size = diskArgs.eq(2).find('input').val();
						var pool = diskArgs.eq(3).find('input').val();
						var password = diskArgs.eq(4).find('input').val();

						// Add disk and format disk
						$.ajax( {
							url : 'lib/cmd.php',
							dataType : 'json',
							data : {
								cmd : 'chvm',
								tgt : node,
								args : '--add3390;' + pool + ';' + address
									+ ';' + size + ';MR;' + password + ';'
									+ password + ';' + password,
								msg : 'cmd=chvm;out=' + out2Id
							},

							success : updateProvisionStatus
						});
					}
				} else {
					// Virtual server created (no OS, no disks)
					var loaderId = 'zProvisionLoader' + out2Id;
					$('#' + loaderId).hide();
				}
			} else {
				// Failed - Do not continue
				var loaderId = 'zProvisionLoader' + out2Id;
				$('#' + loaderId).remove();
			}
		} else {
			// Reset the number of tries
			$.cookie('tries4' + tabId, 0);

			// Get cookie for number of disks
			var disks2add = $.cookie('zProvisionDisks2Add' + out2Id);
			// One less disk to add
			disks2add = disks2add - 1;
			// Set cookie for number of disks
			$.cookie('zProvisionDisks2Add' + out2Id, disks2add);

			// If an operating system is given
			if (osImage) {
				var tmp = osImage.split('-');
				var os = tmp[0];
				var arch = tmp[1];
				var provisionMethod = tmp[2];
				var profile = tmp[3];

				// If this is the last disk added
				if (disks2add < 1) {
					// Set operating system
					$.ajax( {
						url : 'lib/cmd.php',
						dataType : 'json',
						data : {
							cmd : 'nodeadd',
							tgt : '',
							args : node + ';noderes.netboot=zvm;nodetype.os='
								+ os + ';nodetype.arch=' + arch
								+ ';nodetype.profile=' + profile,
							msg : 'cmd=noderes;out=' + out2Id
						},

						success : updateProvisionStatus
					});
				}
			} else {
				// Virtual server created (no OS)
				var loaderId = 'zProvisionLoader' + out2Id;
				$('#' + loaderId).hide();
			}
		}
	}

	/**
	 * 7. Update DHCP
	 */
	else if (cmd == 'noderes') {
		// If no output, no errors occurred
		if (rsp.length) {
			$('#' + statBarId).append(
				'<p>(Error) Failed to set operating system</p>');
		} else {
			$('#' + statBarId).append(
				'<p>Operating system for ' + node + ' set</p>');
		}

		// Update DHCP
		$.ajax( {
			url : 'lib/cmd.php',
			dataType : 'json',
			data : {
				cmd : 'makedhcp',
				tgt : '',
				args : '-a',
				msg : 'cmd=makedhcp;out=' + out2Id
			},

			success : updateProvisionStatus
		});
	}

	/**
	 * 8. Prepare node for boot
	 */
	else if (cmd == 'makedhcp') {
		var failed = false;

		// Separate output into lines
		var p = $('<p></p>');
		for ( var i = 0; i < rsp.length; i++) {
			if (rsp[i]) {
				// Find the node name and insert a break before it
				rsp[i] = rsp[i].replace(new RegExp(node + ': ', 'g'), '<br>');

				p.append(rsp[i]);
				p.append('<br>');

				// If the call failed
				if (rsp[i].indexOf('Failed') > -1
					|| rsp[i].indexOf('Error') > -1) {
					failed = true;
				}
			}
		}

		$('#' + statBarId).append(p);

		// Prepare node for boot
		$.ajax( {
			url : 'lib/cmd.php',
			dataType : 'json',
			data : {
				cmd : 'nodeset',
				tgt : node,
				args : 'install',
				msg : 'cmd=nodeset;out=' + out2Id
			},

			success : updateProvisionStatus
		});
	}

	/**
	 * 9. Boot node from network
	 */
	else if (cmd == 'nodeset') {
		var failed = false;

		// Separate output into lines
		var p = $('<p></p>');
		for ( var i = 0; i < rsp.length; i++) {
			if (rsp[i]) {
				// Find the node name and insert a break before it
				rsp[i] = rsp[i].replace(new RegExp(node + ': ', 'g'), '<br>');

				p.append(rsp[i]);
				p.append('<br>');

				// If the call failed
				if (rsp[i].indexOf('Failed') > -1
					|| rsp[i].indexOf('Error') > -1) {
					failed = true;
				}
			}
		}

		$('#' + statBarId).append(p);

		// If the call failed
		if (failed) {
			// Failed - Do not continue
			var loaderId = 'zProvisionLoader' + out2Id;
			$('#' + loaderId).remove();
		} else {
			// Boot node from network
			$.ajax( {
				url : 'lib/cmd.php',
				dataType : 'json',
				data : {
					cmd : 'rnetboot',
					tgt : node,
					args : 'ipl=000C',
					msg : 'cmd=rnetboot;out=' + out2Id
				},

				success : updateProvisionStatus
			});
		}
	}

	/**
	 * 10. Done
	 */
	else if (cmd == 'rnetboot') {
		var failed = false;

		// Separate output into lines
		var p = $('<p></p>');
		for ( var i = 0; i < rsp.length; i++) {
			if (rsp[i]) {
				// Find the node name and insert a break before it
				rsp[i] = rsp[i].replace(new RegExp(node + ': ', 'g'), '<br>');

				p.append(rsp[i]);
				p.append('<br>');

				// If the call failed
				if (rsp[i].indexOf('Failed') > -1
					|| rsp[i].indexOf('Error') > -1) {
					failed = true;
				}
			}
		}

		$('#' + statBarId).append(p);

		// If the call was successful
		if (!failed) {
			$('#' + statBarId)
				.append(
					'<p>Open a VNC viewer to see the installation progress.  It might take a couple of minutes before you can connect.</p>');
		}

		// Hide loader
		$('#' + statBarId).find('img').hide();
	}
}

/**
 * Update node status bar
 * 
 * @param data
 *            Data returned from HTTP request
 * @return Nothing
 */
function updateZNodeStatus(data) {
	var node = data.msg;
	var rsp = data.rsp;

	// Get cookie for number processes performed against this node
	var actions = $.cookie(node + 'Processes');
	// One less process
	actions = actions - 1;
	$.cookie(node + 'Processes', actions);
	if (actions < 1) {
		// Hide loader when there are no more processes
		var statusBarLoaderId = node + 'StatusBarLoader';
		$('#' + statusBarLoaderId).hide();
	}

	var statusId = node + 'StatusBar';
	var failed = false;

	// Separate output into lines
	var p = $('<p></p>');
	for ( var i = 0; i < rsp.length; i++) {
		if (rsp[i]) {
			// Find the node name and insert a break before it
			rsp[i] = rsp[i].replace(new RegExp(node + ': ', 'g'), '<br>');

			p.append(rsp[i]);
			p.append('<br>');

			// If the call failed
			if (rsp[i].indexOf('Failed') > -1 || rsp[i].indexOf('Error') > -1) {
				failed = true;
			}
		}
	}

	$('#' + statusId).append(p);
}

/**
 * Update the clone status bar
 * 
 * @param data
 *            Data returned from HTTP request
 * @return Nothing
 */
function updateCloneStatus(data) {
	var rsp = data.rsp;
	var args = data.msg.split(';');
	var cmd = args[0].replace('cmd=', '');

	// Get provision instance
	var inst = args[1].replace('inst=', '');
	var out2Id = args[2].replace('out=', '');

	/**
	 * 2. Update /etc/hosts
	 */
	if (cmd == 'nodeadd') {
		var node = args[3].replace('node=', '');

		// If no output, no errors occurred
		if (rsp.length) {
			$('#' + out2Id).append(
				'<p>(Error) Failed to create node definition</p>');
		} else {
			$('#' + out2Id).append(
				'<p>Node definition created for ' + node + '</p>');
		}

		// Is this the last instance
		var tmp = inst.split('/');
		if (tmp[0] == tmp[1]) {
			// Update /etc/hosts
			$.ajax( {
				url : 'lib/cmd.php',
				dataType : 'json',
				data : {
					cmd : 'makehosts',
					tgt : '',
					args : '',
					msg : 'cmd=makehosts;inst=' + inst + ';out=' + out2Id
				},

				success : updateCloneStatus
			});
		}
	}

	/**
	 * 3. Update DNS
	 */
	else if (cmd == 'makehosts') {
		// If no output, no errors occurred
		if (rsp.length) {
			$('#' + out2Id)
				.append('<p>(Error) Failed to update /etc/hosts</p>');
		} else {
			$('#' + out2Id).append('<p>/etc/hosts updated</p>');
		}

		// Update DNS
		$.ajax( {
			url : 'lib/cmd.php',
			dataType : 'json',
			data : {
				cmd : 'makedns',
				tgt : '',
				args : '',
				msg : 'cmd=makedns;inst=' + inst + ';out=' + out2Id
			},

			success : updateCloneStatus
		});
	}

	/**
	 * 4. Clone
	 */
	else if (cmd == 'makedns') {
		// Separate output into lines
		var p = $('<p></p>');
		for ( var i = 0; i < rsp.length; i++) {
			if (rsp[i]) {
				p.append(rsp[i]);
				p.append('<br>');
			}
		}

		$('#' + out2Id).append(p);

		// Get clone tab
		var tabId = out2Id.replace('CloneStatusBar', 'CloneTab');

		// If a node range is given
		var tgtNodeRange = $('#' + tabId + ' input[name=tgtNode]').val();
		var tgtNodes = '';
		if (tgtNodeRange.indexOf('-') > -1) {
			var tmp = tgtNodeRange.split('-');
			// Get node base name
			var nodeBase = tmp[0].match(/[a-zA-Z]+/);
			// Get the starting index
			var nodeStart = parseInt(tmp[0].match(/\d+/));
			// Get the ending index
			var nodeEnd = parseInt(tmp[1]);

			for ( var i = nodeStart; i <= nodeEnd; i++) {
				// Do not append comma for last node
				if (i == nodeEnd) {
					tgtNodes += nodeBase + i.toString();
				} else {
					tgtNodes += nodeBase + i.toString() + ',';
				}
			}
		} else {
			tgtNodes = tgtNodeRange;
		}

		// The tab must be opened for this to work

		// Get other inputs
		var srcNode = $('#' + tabId + ' input[name=srcNode]').val();
		hcp = $('#' + tabId + ' input[name=newHcp]').val();
		var group = $('#' + tabId + ' input[name=newGroup]').val();
		var diskPool = $('#' + tabId + ' input[name=diskPool]').val();
		var diskPw = $('#' + tabId + ' input[name=diskPw]').val();
		if (!diskPw) {
			diskPw = '';
		}

		// Clone
		$.ajax( {
			url : 'lib/cmd.php',
			dataType : 'json',
			data : {
				cmd : 'mkvm',
				tgt : tgtNodes,
				args : srcNode + ';pool=' + diskPool + ';pw=' + diskPw,
				msg : 'cmd=mkvm;inst=' + inst + ';out=' + out2Id
			},

			success : updateCloneStatus
		});
	}

	/**
	 * 5. Done
	 */
	else if (cmd == 'mkvm') {
		var failed = false;

		// Separate output into lines
		var p = $('<p></p>');
		for ( var i = 0; i < rsp.length; i++) {
			if (rsp[i]) {
				p.append(rsp[i]);
				p.append('<br>');

				// If the call failed
				if (rsp[i].indexOf('Failed') > -1
					|| rsp[i].indexOf('Error') > -1) {
					failed = true;
				}
			}
		}

		$('#' + out2Id).append(p);

		// Hide loader
		$('#' + out2Id).find('img').hide();
	}
}

/**
 * Get node attributes from HTTP request data
 * 
 * @param propNames
 *            Hash table of property names
 * @param keys
 *            Property keys
 * @param data
 *            Data from HTTP request
 * @return Hash table of property values
 */
function getNodeAttrs(keys, propNames, data) {
	// Create hash table for property values
	var attrs = new Object();

	// Go through inventory and separate each property out
	var curKey; // Current property key
	var addLine; // Add a line to the current property?
	for ( var i = 1; i < data.length; i++) {
		addLine = true;

		// Loop through property keys
		// Does this line contains one of the properties?
		for ( var j = 0; j < keys.length; j++) {

			// Find property name
			if (data[i].indexOf(propNames[keys[j]]) > -1) {
				attrs[keys[j]] = new Array();

				// Get rid of property name in the line
				data[i] = data[i].replace(propNames[keys[j]], '');
				// Trim the line
				data[i] = jQuery.trim(data[i]);

				// Do not insert empty line
				if (data[i].length > 0) {
					attrs[keys[j]].push(data[i]);
				}

				curKey = keys[j];
				addLine = false; // This line belongs to a property
			}
		}

		// Line does not contain a property
		// Must belong to previous property
		if (addLine && data[i].length > 1) {
			data[i] = jQuery.trim(data[i]);
			attrs[curKey].push(data[i]);
		}
	}

	return attrs;
}

/**
 * Add processor
 * 
 * @param v
 *            Value of the button clicked
 * @param m
 *            jQuery object of the message within the active state when the user
 *            clicked the button
 * @param f
 *            Key/value pairs of the form values
 * 
 * @return Nothing
 */
function addProcessor(v, m, f) {
	// If user clicks Ok, add processor
	if (v) {
		var node = f.procNode;
		var type = f.procType;
		var address = f.procAddress;

		// Add processor
		$.ajax( {
			url : 'lib/cmd.php',
			dataType : 'json',
			data : {
				cmd : 'chvm',
				tgt : node,
				args : '--addprocessoractive;' + address + ';' + type,
				msg : node
			},

			success : updateZNodeStatus
		});

		// Increment node process and save it in a cookie
		incrementZNodeProcess(node);

		// Show loader
		var statusId = node + 'StatusBar';
		var statusBarLoaderId = node + 'StatusBarLoader';
		$('#' + statusBarLoaderId).show();
		$('#' + statusId).show();
	}
}

/**
 * Add disk
 * 
 * @param v
 *            Value of the button clicked
 * @param m
 *            jQuery object of the message within the active state when the user
 *            clicked the button
 * @param f
 *            Key/value pairs of the form values
 * @return Nothing
 */
function addDisk(v, m, f) {
	// If user clicks Ok, add disk
	if (v) {
		var node = f.diskNode;
		var type = f.diskType;
		var address = f.diskAddress;
		var size = f.diskSize;
		var pool = f.diskPool;
		var password = f.diskPassword;

		// Add disk
		if (type == '3390') {
			$.ajax( {
				url : 'lib/cmd.php',
				dataType : 'json',
				data : {
					cmd : 'chvm',
					tgt : node,
					args : '--add3390;' + pool + ';' + address + ';' + size
						+ ';MR;' + password + ';' + password + ';' + password,
					msg : node
				},

				success : updateZNodeStatus
			});

			// Increment node process and save it in a cookie
			incrementZNodeProcess(node);

			// Show loader
			var statusId = node + 'StatusBar';
			var statusBarLoaderId = node + 'StatusBarLoader';
			$('#' + statusBarLoaderId).show();
			$('#' + statusId).show();
		}
	}
}

/**
 * Add NIC
 * 
 * @param v
 *            Value of the button clicked
 * @param m
 *            jQuery object of the message within the active state when the user
 *            clicked the button
 * @param f
 *            Key/value pairs of the form values
 * @return Nothing
 */
function addNic(v, m, f) {
	// If user clicks Ok, add NIC
	if (v) {
		var node = f.nicNode;
		var nicType = f.nicType;
		var networkType = f.nicNetworkType;
		var address = f.nicAddress;

		/**
		 * Add guest LAN
		 */
		if (networkType == 'Guest LAN') {
			var temp = f.nicLanName.split(' ');
			var lanName = temp[1];
			var lanOwner = temp[0];

			// Add NIC
			$.ajax( {
				url : 'lib/cmd.php',
				dataType : 'json',
				data : {
					cmd : 'chvm',
					tgt : node,
					args : '--addnic;' + address + ';' + nicType + ';3',
					msg : 'node=' + node + ';addr=' + address + ';lan='
						+ lanName + ';owner=' + lanOwner
				},
				success : connect2GuestLan
			});
		}

		/**
		 * Add virtual switch
		 */
		else if (networkType == 'Virtual Switch') {
			var temp = f.nicVSwitchName.split(' ');
			var vswitchName = temp[1];

			// Add NIC
			$.ajax( {
				url : 'lib/cmd.php',
				dataType : 'json',
				data : {
					cmd : 'chvm',
					tgt : node,
					args : '--addnic;' + address + ';' + nicType + ';3',
					msg : 'node=' + node + ';addr=' + address + ';vsw='
						+ vswitchName
				},

				success : connect2VSwitch
			});
		}

		// Increment node process and save it in a cookie
		incrementZNodeProcess(node);

		// Show loader
		var statusId = node + 'StatusBar';
		var statusBarLoaderId = node + 'StatusBarLoader';
		$('#' + statusBarLoaderId).show();
		$('#' + statusId).show();
	}
}

/**
 * Remove processor
 * 
 * @param node
 *            Node where processor is attached
 * @param address
 *            Virtual address of processor
 * @return Nothing
 */
function removeProcessor(node, address) {
	// Remove processor
	$.ajax( {
		url : 'lib/cmd.php',
		dataType : 'json',
		data : {
			cmd : 'chvm',
			tgt : node,
			args : '--removeprocessor;' + address,
			msg : node
		},

		success : updateZNodeStatus
	});

	// Increment node process and save it in a cookie
	incrementZNodeProcess(node);

	// Show loader
	var statusId = node + 'StatusBar';
	var statusBarLoaderId = node + 'StatusBarLoader';
	$('#' + statusBarLoaderId).show();
	$('#' + statusId).show();
}

/**
 * Remove disk
 * 
 * @param node
 *            Node where disk is attached
 * @param address
 *            Virtual address of disk
 * @return Nothing
 */
function removeDisk(node, address) {
	// Remove disk
	$.ajax( {
		url : 'lib/cmd.php',
		dataType : 'json',
		data : {
			cmd : 'chvm',
			tgt : node,
			args : '--removedisk;' + address,
			msg : node
		},

		success : updateZNodeStatus
	});

	// Increment node process and save it in a cookie
	incrementZNodeProcess(node);

	// Show loader
	var statusId = node + 'StatusBar';
	var statusBarLoaderId = node + 'StatusBarLoader';
	$('#' + statusBarLoaderId).show();
	$('#' + statusId).show();
}

/**
 * Remove NIC
 * 
 * @param node
 *            Node where NIC is attached
 * @param address
 *            Virtual address of NIC
 * @return Nothing
 */
function removeNic(node, nic) {
	var args = nic.split('.');
	var address = args[0];

	// Remove NIC
	$.ajax( {
		url : 'lib/cmd.php',
		dataType : 'json',
		data : {
			cmd : 'chvm',
			tgt : node,
			args : '--removenic;' + address,
			msg : node
		},

		success : updateZNodeStatus
	});

	// Set cookie for number actions performed against node
	incrementZNodeProcess(node);

	// Show loader
	var statusId = node + 'StatusBar';
	var statusBarLoaderId = node + 'StatusBarLoader';
	$('#' + statusBarLoaderId).show();
	$('#' + statusId).show();
}

/**
 * Set a cookie for the disk pool names of a given node
 * 
 * @param data
 *            Data from HTTP request
 * @return Nothing
 */
function setDiskPoolCookies(data) {
	// Do not set cookie if there is no output
	if (data.rsp) {
		var node = data.msg;
		var pools = data.rsp[0].split(node + ': ');
		$.cookie(node + 'DiskPools', pools);
	}
}

/**
 * Set a cookie for the network names of a given node
 * 
 * @param data
 *            Data from HTTP request
 * @return Nothing
 */
function setNetworkCookies(data) {
	// Do not set cookie if there is no output
	if (data.rsp) {
		var node = data.msg;
		var networks = data.rsp[0].split(node + ': ');
		$.cookie(node + 'Networks', networks);
	}
}

/**
 * Get the resources for ZVM
 * 
 * @param data
 *            Data from HTTP request
 * @return Nothing
 */
function getZResources(data) {
	// Do not set cookie if there is no output
	if (data.rsp) {
		// Loop through each line
		var node, hcp;
		var hcpHash = new Object();
		for ( var i in data.rsp) {
			node = data.rsp[i][0];
			hcp = data.rsp[i][1];
			hcpHash[hcp] = 1;
		}

		// Create an array for hardware control points
		var hcps = new Array();
		for ( var key in hcpHash) {
			hcps.push(key);
			// Get the short host name
			hcp = key.split('.')[0];

			// Get disk pools
			$.ajax( {
				url : 'lib/cmd.php',
				dataType : 'json',
				data : {
					cmd : 'lsvm',
					tgt : hcp,
					args : '--diskpoolnames',
					msg : hcp
				},

				success : getDiskPool
			});

			// Get network names
			$.ajax( {
				url : 'lib/cmd.php',
				dataType : 'json',
				data : {
					cmd : 'lsvm',
					tgt : hcp,
					args : '--getnetworknames',
					msg : hcp
				},

				success : getNetwork
			});
		}

		// Set cookie
		$.cookie('HCP', hcps);
	}
}

/**
 * Get the contents of each disk pool
 * 
 * @param data
 *            HTTP request data
 * @return Nothing
 */
function getDiskPool(data) {
	if (data.rsp) {
		var hcp = data.msg;
		var pools = data.rsp[0].split(hcp + ': ');

		// Get the contents of each disk pool
		for ( var i in pools) {
			if (pools[i]) {
				// Get used space
				$.ajax( {
					url : 'lib/cmd.php',
					dataType : 'json',
					data : {
						cmd : 'lsvm',
						tgt : hcp,
						args : '--diskpool;' + pools[i] + ';used',
						msg : 'hcp=' + hcp + ';pool=' + pools[i] + ';stat=used'
					},

					success : loadDiskPoolTable
				});

				// Get free space
				$.ajax( {
					url : 'lib/cmd.php',
					dataType : 'json',
					data : {
						cmd : 'lsvm',
						tgt : hcp,
						args : '--diskpool;' + pools[i] + ';free',
						msg : 'hcp=' + hcp + ';pool=' + pools[i] + ';stat=free'
					},

					success : loadDiskPoolTable
				});
			}
		}

	}
}

/**
 * Get the details of each network
 * 
 * @param data
 *            HTTP request data
 * @return Nothing
 */
function getNetwork(data) {
	if (data.rsp) {
		var hcp = data.msg;
		var networks = data.rsp[0].split(hcp + ': ');

		// Get the network details
		for ( var i = 1; i < networks.length; i++) {
			var args = networks[i].split(' ');
			var type = args[0];
			var name = args[1];

			// Get network details
			$.ajax( {
				url : 'lib/cmd.php',
				dataType : 'json',
				data : {
					cmd : 'lsvm',
					tgt : hcp,
					args : '--getnetwork;' + name,
					msg : 'hcp=' + hcp + ';type=' + type + ';network=' + name
				},

				success : loadNetworkTable
			});
		}
	}
}

/**
 * Load the disk pool contents into a table
 * 
 * @param data
 *            HTTP request data
 * @return Nothing
 */
function loadDiskPoolTable(data) {
	var args = data.msg.split(';');
	var hcp = args[0].replace('hcp=', '');
	var pool = args[1].replace('pool=', '');
	var stat = args[2].replace('stat=', '');
	var tmp = data.rsp[0].split(hcp + ': ');

	// Remove loader
	var loaderID = 'zvmResourceLoader';
	if ($('#' + loaderID).length) {
		$('#' + loaderID).remove();
	}

	// Resource tab ID
	var tabID = 'zvmResourceTab';

	// Get datatable (if any)
	var dTable = getDiskDataTable();
	if (!dTable) {
		// Create disks section
		var fieldSet = $('<fieldset></fieldset>');
		var legend = $('<legend>Disks</legend>');
		fieldSet.append(legend);

		// Create a datatable
		var tableID = 'zDiskDataTable';
		var table = new DataTable(tableID);
		// Resource headers: volume ID, device type, start address, and size
		table.init( [ 'Hardware control point', 'Pool', 'Status', 'Volume ID',
			'Device type', 'Start address', 'Size' ]);

		// Append datatable to tab
		fieldSet.append(table.object());
		$('#' + tabID).append(fieldSet);

		// Turn into datatable
		dTable = $('#' + tableID).dataTable();
		setDiskDataTable(dTable);
	}

	// Skip index 0 and 1 because it contains nothing
	for ( var i = 2; i < tmp.length; i++) {
		var diskAttrs = tmp[i].split(' ');
		dTable.fnAddData( [ hcp, pool, stat, diskAttrs[0], diskAttrs[1],
			diskAttrs[2], diskAttrs[3] ]);
	}
}

/**
 * Load the network details into a table
 * 
 * @param data
 *            HTTP request data
 * @return Nothing
 */
function loadNetworkTable(data) {
	var args = data.msg.split(';');
	var hcp = args[0].replace('hcp=', '');
	var type = args[1].replace('type=', '');
	var name = args[2].replace('network=', '');
	var tmp = data.rsp[0].split(hcp + ': ');

	// Remove loader
	var loaderID = 'zvmResourceLoader';
	if ($('#' + loaderID).length) {
		$('#' + loaderID).remove();
	}

	// Resource tab ID
	var tabID = 'zvmResourceTab';

	// Get datatable (if any)
	var dTable = getNetworkDataTable();
	if (!dTable) {
		// Create networks section
		var fieldSet = $('<fieldset></fieldset>');
		var legend = $('<legend>Networks</legend>');
		fieldSet.append(legend);

		// Create table
		var tableID = 'zNetworkDataTable';
		var table = new DataTable(tableID);
		table.init( [ 'Hardware control point', 'Type', 'Name', 'Details' ]);

		// Append datatable to tab
		fieldSet.append(table.object());
		$('#' + tabID).append(fieldSet);

		// Turn into datatable
		dTable = $('#' + tableID).dataTable();
		setNetworkDataTable(dTable);

		// Set the column width
		var cols = table.object().find('thead tr th');
		cols.eq(0).css('width', '20px'); // HCP column
		cols.eq(1).css('width', '20px'); // Type column
		cols.eq(2).css('width', '20px'); // Name column
		cols.eq(3).css('width', '600px'); // Details column
	}

	// Skip index 0 because it contains nothing
	var details = '';
	for ( var i = 1; i < tmp.length; i++) {
		details += tmp[i] + '<br>';
	}
	dTable.fnAddData( [ hcp, type, name, details ]);
}

/**
 * Connect a NIC to a Guest LAN
 * 
 * @param data
 *            Data from HTTP request
 * @return Nothing
 */
function connect2GuestLan(data) {
	var rsp = data.rsp;
	var args = data.msg.split(';');
	var node = args[0].replace('node=', '');
	var address = args[1].replace('addr=', '');
	var lanName = args[2].replace('lan=', '');
	var lanOwner = args[3].replace('owner=', '');

	var statusId = node + 'StatusBar';
	var failed = false;

	// Separate output into lines
	var p = $('<p></p>');
	for ( var i = 0; i < rsp.length; i++) {
		if (rsp[i]) {
			// Find the node name and insert a break before it
			rsp[i] = rsp[i].replace(new RegExp(node + ': ', 'g'), '<br>');

			p.append(rsp[i]);
			p.append('<br>');

			// If the call failed
			if (rsp[i].indexOf('Failed') > -1 || rsp[i].indexOf('Error') > -1) {
				failed = true;
			}
		}
	}

	$('#' + statusId).append(p);

	// Connect NIC to Guest LAN
	$.ajax( {
		url : 'lib/cmd.php',
		dataType : 'json',
		data : {
			cmd : 'chvm',
			tgt : node,
			args : '--connectnic2guestlan;' + address + ';' + lanName + ';'
				+ lanOwner,
			msg : node
		},

		success : updateZNodeStatus
	});
}

/**
 * Connect a NIC to a VSwitch
 * 
 * @param data
 *            Data from HTTP request
 * @return Nothing
 */
function connect2VSwitch(data) {
	var rsp = data.rsp;
	var args = data.msg.split(';');
	var node = args[0].replace('node=', '');
	var address = args[1].replace('addr=', '');
	var vswitchName = args[2].replace('vsw=', '');

	var statusId = node + 'StatusBar';
	var failed = false;

	// Separate output into lines
	var p = $('<p></p>');
	for ( var i = 0; i < rsp.length; i++) {
		if (rsp[i]) {
			// Find the node name and insert a break before it
			rsp[i] = rsp[i].replace(new RegExp(node + ': ', 'g'), '<br>');

			p.append(rsp[i]);
			p.append('<br>');

			// If the call failed
			if (rsp[i].indexOf('Failed') > -1 || rsp[i].indexOf('Error') > -1) {
				failed = true;
			}
		}
	}

	$('#' + statusId).append(p);

	// Connect NIC to VSwitch
	$.ajax( {
		url : 'lib/cmd.php',
		dataType : 'json',
		data : {
			cmd : 'chvm',
			tgt : node,
			args : '--connectnic2vswitch;' + address + ';' + vswitchName,
			msg : node
		},

		success : updateZNodeStatus
	});
}