
(function() {
  var compile, compiler, elements, findPaths, graph, i, j, language, len, len1, name, ref, showElements, source, target, type, updateURL;

	////////////////////////////////////////////////
		
	//https://stackoverflow.com/a/3426956/179081 
	function hashCode(str) { // java String#hashCode
			var hash = 0;
			for (var i = 0; i < str.length; i++) {
					   hash = str.charCodeAt(i) + ((hash << 5) - hash);
					}
			return hash;
	}

	function intToRGB(i){
			var c = (i & 0x00FFFFFF)
				.toString(16)
				.toUpperCase();

			return "#00000".substring(0, 7 - c.length) + c;
	}

	function strToRGB(str){
		return intToRGB(hashCode(str));
	}
	//////////////////////////////////////////



  this.LANGUAGES = new Set;
  elements = [];
  function add_language(language) {
	if (LANGUAGES.has(language)) {
		return;
	}
	unflavoured_language = language.split('(')[0];
	
    elements.push({
		data: {
		  id: language,
		  color: COLORS[unflavoured_language] || strToRGB(unflavoured_language)
		}
	});
	LANGUAGES.add(language);
  }

	COMPILERS.forEach(function(compiler) {
		({name, sources, targets, type} = compiler);
		sources.forEach(function (source) {
			add_language(source);
			targets.forEach(function (target) {
				add_language(target);
				elements.push({
					data: {
						id: name + ": " + source + " -> " + target,
						name: name,
						source: source,
						target: target,
						type: type,
						sourceColor: COLORS[source] || '#ccc',
						targetColor: COLORS[target] || '#ccc'
					}
				});
			}); //TARGETS
		}); // SOURCES
	}); //COMPILERS

  graph = null;

  window.onload = function() {
    var cycles, direct, form, k, key, layout, len2, param, queryParams, ref1, value;
    graph = cytoscape({
      container: document.getElementById('graph'),
      elements: elements,
      style: [
        {
          selector: 'node',
          style: {
            'label': 'data(id)',
            'font-size': function(ele) {
              return Math.max(14,
        9 + 0.25 * ele.incomers().length);
            },
            'width': 'label',
            'height': function(ele) {
              return Math.min(50,
        10 + 2 * ele.incomers().length);
            },
            'color': 'white',
            'background-color': 'data(color)',
            'text-valign': 'center',
            'padding-left': 10,
            'padding-right': 10,
            'padding-top': 10,
            'padding-bottom': 10
          }
        },
        {
          selector: 'edge',
          style: {
            'label': 'data(name)',
            'width': 3,
            'font-size': function(ele) {
              return Math.min(Math.max(22 - ele.style()['label'].length,
        9),
        12);
            },
            'color': 'black',
            'line-color': 'data(sourceColor)',
            'target-arrow-color': 'data(sourceColor)',
            'target-arrow-shape': 'triangle',
            'text-rotation': 'autorotate',
            'text-margin-y': -10,
            'opacity': 0.7,
            'curve-style': 'bezier'
          }
        }
      ]
    });
    queryParams = {};
    ref1 = location.search.slice(1).split('&');
    for (k = 0, len2 = ref1.length; k < len2; k++) {
      param = ref1[k];
      [key, value] = param.split('=');
      queryParams[key] = decodeURIComponent(value);
    }
    ({source, target, direct, cycles} = queryParams);
    form = document.forms[0];
    [form.source.value, form.target.value, form.direct.checked, form.cycles.checked] = [source || '', target || '', direct, cycles];
    if (source || target) {
      compile(source, target, direct, cycles);
    }
    layout = graph.layout({
      name: 'cose-bilkent',
      idealEdgeLength: 100,
      nodeRepulsion: 100000,
      padding: 40,
      randomize: false
    });
    return layout.run();
  };

  this.filter = function(e) {
    var cycles, direct, form;
    e.preventDefault();
    form = e.currentTarget;
    [source, target, direct, cycles] = [form.source.value, form.target.value, form.direct.checked, form.cycles.checked];
    updateURL({source, target, direct, cycles});
    return compile(source, target, direct, cycles);
  };

  this.show = function() {
    updateURL();
    return compile();
  };

  findPaths = function*(sourceNode, targetNode, path) {
    var edge, k, len2, node, ref1, results;
    if (!path) {
      path = sourceNode.cy().collection();
    }
    if (sourceNode === targetNode) {
      return (yield path);
    }
    ref1 = sourceNode.outgoers('edge');
    results = [];
    for (k = 0, len2 = ref1.length; k < len2; k++) {
      edge = ref1[k];
      node = edge.target();
      if (path.connectedNodes().contains(node)) {
        continue;
      }
      path.merge(edge);
      yield* findPaths(node, targetNode, path);
      results.push(path.unmerge(edge));
    }
    return results;
  };

  compile = function(source, target, direct, cycles) {
    var count, path, ref1, sourceNode, targetNode, text;
    info.innerText = 'Select a language from the list';
    if ((source && !LANGUAGES.has(source)) || (target && !LANGUAGES.has(target))) {
      return;
    }
    if (source) {
      sourceNode = graph.getElementById(source);
    }
    if (target) {
      targetNode = graph.getElementById(target);
    }
    if (sourceNode && targetNode) {
      if (direct || cycles) {
        elements = (direct ? sourceNode.edgesTo(targetNode) : sourceNode.successors().intersection(targetNode.predecessors())).add([sourceNode, targetNode]);
        text = '';
      } else {
        elements = graph.collection().add([sourceNode, targetNode]);
        count = 0;
        ref1 = findPaths(sourceNode, targetNode);
        for (path of ref1) {
          elements.merge(path.connectedNodes());
          elements.merge(path);
          count += 1;
        }
        text = count === 1 ? `${count} way to compile ${source} to ${target}` : `${count} ways to compile ${source} to ${target}`;
      }
      showElements(elements);
    } else if (sourceNode) {
      elements = (direct ? sourceNode.outgoers() : sourceNode.successors()).add(sourceNode);
      showElements(elements);
      count = elements.nodes().length - 1;
      text = count === 1 ? `${source} compiles to ${count} language` : `${source} compiles to ${count} languages`;
      if (direct) {
        text += " directly";
      }
    } else if (targetNode) {
      elements = (direct ? targetNode.incomers() : targetNode.predecessors()).add(targetNode);
      showElements(elements);
      count = elements.nodes().length - 1;
      text = count === 1 ? `${count} language compiles to ${target}` : `${count} languages compile to ${target}`;
      if (direct) {
        text += " directly";
      }
    } else {
      elements = graph.elements();
      elements.style({
        display: 'element'
      });
      text = `${LANGUAGES.size} languages`;
    }
    return info.innerText = `${text}\n${(elements.edges().length)} compilers`;
  };

  updateURL = function(params) {
    var key, queryParts, value;
    queryParts = [];
    for (key in params) {
      value = params[key];
      if (value) {
        queryParts.push(`${key}=${encodeURIComponent(value)}`);
      }
    }
    return history.replaceState(params, '', queryParts.length ? `?${queryParts.join('&')}` : location.pathname);
  };

  showElements = function(elements) {
    return graph.batch(function() {
      graph.elements().style({
        display: 'none'
      });
      return elements.style({
        display: 'element'
      });
    });
  };

}).call(this);

//# sourceMappingURL=main.js.map
