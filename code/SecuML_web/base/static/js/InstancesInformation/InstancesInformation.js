var num_coeff = 15;

// Annotation and Description panels
function displayInstancePanel(parent_div, annotation = true) {
  var instance_panel = createPanel('panel-primary', 'col-md-12', 'Instance', parent_div,
          return_heading = true);
  var instance = instance_panel[0];
  var instance_title = instance_panel[1];
  instance_title.setAttribute('id', 'instance_title');
  if (annotation) {
    var annotation = createPanel('panel-primary', 'col-md-5',
                                 'Annotation', instance);
    annotation.setAttribute('id', 'instance_label');
  }
  var col_size = 'col-md-7';
  if (!annotation) {
      col_size = 'col-md-12';
  }
  var instance_panel = createPanel('panel-primary', col_size, 'Description', instance);
  var instance_proba = createDivWithClass('instance_predicted_proba', 'row', instance_panel);
  var instance_data = createDivWithClass('instance_data', 'col', instance_panel);
}

function setInstancesSettings(train_test, project, dataset, experiment_id, experiment_label_id,
        callback) {
    if (train_test == 'validation') {
      var query = buildQuery('getActiveLearningValidationConf',
                      [project, dataset, experiment_id]);
      jQuery.getJSON(query, function(data) {
        inst_dataset      = data['test_dataset'].split('__')[0];
        inst_exp_id       = data['test_exp']['experiment_id'];
        inst_exp_label_id = data['test_exp']['experiment_label_id'];
        has_families = datasetHasFamilies(project, inst_dataset, inst_exp_label_id);
        callback();
      });
    } else if (train_test == 'train') {
      inst_dataset = dataset;
      inst_exp_id = experiment_id;
      inst_exp_label_id = experiment_label_id;
      has_families = datasetHasFamilies(project, inst_dataset, inst_exp_label_id);
      callback();
    } else {
      var query = buildQuery('getSupervisedValidationConf',
                      [project, dataset, experiment_id]);
      jQuery.getJSON(query, function(data) {
        if (data['method'] == 'random_split' || data['method'] == 'unlabeled') {
            inst_dataset = dataset;
            inst_exp_id = experiment_id;
            inst_exp_label_id = experiment_label_id;
        } else {
            inst_dataset      = data['test_dataset'].split('__')[0];
            inst_exp_id       = data['test_exp']['experiment_id'];
            inst_exp_label_id = data['test_exp']['experiment_label_id'];
        }
        has_families = datasetHasFamilies(project, inst_dataset, inst_exp_label_id);
        callback();
      });
    }
}

function displayInstanceInformationStructure() {
    var tabs_div = document.getElementById('instance_data');

    var menu_titles = [];
    var menu_labels = [];

    var menu_titles = ['Features'];
    var menu_labels = ['features'];
    if (conf.kind == 'Classification') {
        if (conf.classification_conf.feature_coefficients) {
          menu_titles.push('Weighted Features');
          menu_labels.push('weighted_features');
        }
    }
    try {
        specific_tabs = specificTabs();
        menu_titles.unshift(specific_tabs[0]);
        menu_labels.unshift(specific_tabs[1]);
    } catch(err) {
        console.log('TODO: specific function to print information about an instance');
    }
    var menu = createTabsMenu(menu_labels, menu_titles, tabs_div, 'instance_tabs');
}

function printInstanceInformation(selected_id, suggested_label = null, suggested_family = null) {
  cleanInstanceInformation();
  var ident = printInstanceIndent(selected_id);
  printInstanceLabel(selected_id, suggested_label, suggested_family);
  printInstanceData(selected_id, ident);
}

function cleanInstanceData() {
  cleanFeatures();
  if (conf.kind == 'Classification') {
    cleanWeightedFeatures();
  }
  try {
      cleanSpecificInformations();
  } catch(err) {
      return;
  }
}

function printInstanceData(selected_id, ident) {
  printFeatures(selected_id);
  if (conf.kind == 'Classification') {
    printWeightedFeatures(selected_id);
  }
  try {
      printSpecificInformations(selected_id, ident);
  } catch(err) {
      return;
  }
}

function cleanInstanceInformation() {
  try {
    cleanInformation();
  } catch (err) {
  }
}

function printInstanceIndent(selected_id) {
    var query = buildQuery('getIdent',
                    [project, inst_dataset, selected_id]);
    var ident = $.ajax({url: query, async: false}).responseText;
    document.getElementById('instance_title').textContent = 'Instance ' + selected_id + ': ' + ident;
    return ident;
}

function printInstanceLabel(selected_id, suggested_label, suggested_family) {
      updateInstanceLabel(selected_id);
      displaySuggestedValue(suggested_label, suggested_family);
}

function displaySuggestedValue(suggested_label, suggested_family) {
  var suggestion_value = cleanDiv('suggested_family');
  if (suggestion_value) {
      if (suggested_label && suggested_family) {
          if (suggested_label == 'benign') {
            suggestion_value.setAttribute('class', 'btn btn-sm btn-success');
          } else {
            suggestion_value.setAttribute('class', 'btn btn-sm btn-danger');
          }
          suggestion_value.appendChild(document.createTextNode(suggested_family));
          suggestion_value.addEventListener('click', selectSuggestedFamily(suggested_label, suggested_family));
      } else {
          var suggestion_value = cleanDiv('suggested_family');
          suggestion_value.setAttribute('class', 'btn btn-sm btn-default disabled');
          suggestion_value.addEventListener('click', null);
          suggestion_value.appendChild(document.createTextNode('None'));
      }
  }
}

function selectSuggestedFamily(label, family) {
  return function() {
    var other_label = otherLabel(label);
    var prefix = 'instance_';
    $('#' + prefix + label + '_family_selector')[0].value = family;
    $('#' + prefix + other_label + '_family_selector')[0].selectedIndex = -1;
  }
}

function updateInstanceLabel(selected_id) {
    var query = buildQuery('getLabel',
                           [project, inst_dataset, inst_exp_label_id, selected_id]);
    jQuery.getJSON(query, function(data){
      var prefix = 'instance_';
      if (Object.keys(data).length == 2) {
        var label = data.label;
        var family = data.family;
        displayAnnotation(label, family);
      } else {
        undisplayAnnotation();
      }
    });
}

function addFamilyCallback(label) {
    var prefix = 'instance_';
    return function() {
        var select = $('#' + prefix + label + '_family_selector')[0];
        var new_family = $('#' + prefix + label + '_add_family_field').val();
        // Check not already in the select list
        for (var i = 0, n = select.options.length; i < n; i++) {
          if (select.options[i].text == new_family) {
              alert('This family already exists.');
              return;
          }
        }
        if (new_family != '') {
            addElementToSelectList(select, new_family, selected = true);
            familyChangeCallback(label)();
            $('#' + prefix + label + '_add_family_field')[0].value = '';
        } else {
            alert('Cannot add an empty family.');
        }
    }
}

function displayFamilySelector(label_row, label) {
  var prefix = 'instance_';
  var col = createDivWithClass(null, 'col-md-5', parent_div = label_row);
  // Selection
  var select = $('#' + prefix + label + '_family_selector')[0];
  var label_title = label.charAt(0).toUpperCase() + label.substr(1) + ' Families';
  var selector_size = 6;
  createSelectList(prefix + label + '_family_selector', selector_size, null, col, label_title);
  var select = $('#' + prefix + label + '_family_selector')[0];
  // Adding value input
  var form_group = createDivWithClass(null, 'form-group', col);
  var input_group = createDivWithClass(null, 'input-group', form_group);
  // Input field
  var add_family_field = document.createElement('input');
  add_family_field.setAttribute('class', 'form-control');
  add_family_field.setAttribute('type', 'text');
  add_family_field.setAttribute('id', prefix + label + '_add_family_field');
  add_family_field.setAttribute('size', 5);
  input_group.appendChild(add_family_field);
  // Button
  var button_span = document.createElement('span');
  button_span.setAttribute('class', 'input-group-btn');
  input_group.appendChild(button_span);
  var add_family_button = document.createElement('button');
  add_family_button.id = prefix + 'add_family_button';
  add_family_button.setAttribute('class', 'btn btn-default');
  add_family_button.setAttribute('type', 'button');
  var text = document.createTextNode('Add');
  add_family_button.appendChild(text);
  add_family_button.addEventListener('click', addFamilyCallback(label));
  button_span.appendChild(add_family_button);
  // Family values
  var query = buildQuery('getLabelsFamilies', [project, inst_dataset, inst_exp_label_id, 'None']);
  jQuery.getJSON(query, function(data) {
      var select = $('#' + prefix + label + '_family_selector')[0];
      if (data[label]) {
        var families = Object.keys(data[label]);
        families.forEach(function(q) {
            addElementToSelectList(select, q);
        });
      } else {
          // When there is no family, the default family, 'other' is proposed
          addElementToSelectList(select, 'other');

      }
  });
  // Add family selector callback
  select.addEventListener('change', familyChangeCallback(label));
  return col;
}

function familyChangeCallback(selected_label) {
    return function() {
      // Unselect the family of the other label
      var other_label = otherLabel(selected_label);
      var other_selector = $('#' + 'instance_' + other_label + '_family_selector')[0];
      other_selector.selectedIndex = -1;
    }
}

function displayAnnotation(label, family) {
  // Annotation
  var label_group = cleanDiv('label_group');
  var label_label = document.createElement('label');
  label_label.setAttribute('class', 'col-md-6 control-label');
  label_label.appendChild(document.createTextNode('Annotation'));
  label_group.appendChild(label_label);
  var label_value = document.createElement('button');
  if (label == 'malicious') {
    label_value.setAttribute('class', 'col-md-6 btn btn-sm btn-danger');
  } else {
    label_value.setAttribute('class', 'col-md-6 btn btn-sm btn-success');
  }
  label_value.setAttribute('type', 'button');
  if (has_families) {
    label_value.appendChild(document.createTextNode(family));
  } else {
    label_value.appendChild(document.createTextNode(label));
  }
  label_value.addEventListener('click', function () {
      displayAnnotation(label, family);
  });
  label_group.appendChild(label_value);
  // Family selectors
  var other_label = otherLabel(label);
  var prefix = 'instance_';
  if ($('#' + prefix + label + '_family_selector')[0]) {
    $('#' + prefix + label + '_family_selector')[0].value = family;
    $('#' + prefix + other_label + '_family_selector')[0].selectedIndex = -1;
  }
}

function undisplayAnnotation() {
  var prefix = 'instance_';
  var label_group = cleanDiv('label_group');
  if ($('#' + prefix + 'malicious_family_selector')[0]) {
    $('#' + prefix + 'malicious_family_selector')[0].selectedIndex = -1;
    $('#' + prefix + 'benign_family_selector')[0].selectedIndex = -1;
  }
}

function displayAnnotationDiv(suggestion = false, interactive = true) {
  var prefix = 'instance_';
  var label_div = cleanDiv('instance_label');
  var form = document.createElement('form');
  form.setAttribute('class', 'form-horizontal');
  label_div.appendChild(form);
  var fieldset = document.createElement('fieldset');
  form.appendChild(fieldset);

  // Suggestion
  var suggestion_group = createDivWithClass('', 'form-group col-md-2', fieldset);
  if (suggestion) {
     var suggestion_label = document.createElement('label');
     suggestion_label.setAttribute('class', 'col-md-6 control-label');
     suggestion_label.appendChild(document.createTextNode('Suggestion'));
     suggestion_group.appendChild(suggestion_label);
     var suggestion_value = document.createElement('button');
     suggestion_value.setAttribute('class', 'col-md-4 btn btn-sm btn-default disabled');
     suggestion_value.setAttribute('id', 'suggested_family');
     suggestion_value.setAttribute('type', 'button');
     suggestion_value.appendChild(document.createTextNode('None'));
     suggestion_group.appendChild(suggestion_value);
  }

  // Annotation
  var label_group = createDivWithClass('', 'form-group col-md-10', fieldset);
  label_group.setAttribute('id', 'label_group');

  if (interactive) {
      displayUpdateAnnotationForm(form);
  }
}

function displayUpdateAnnotationForm(form) {
  var fieldset = document.createElement('fieldset');
  form.appendChild(fieldset);
  // Available Families
  var malicious_col = displayFamilySelector(fieldset, 'malicious');
  createDivWithClass(null, 'col-md-1', parent_div = fieldset);
  var benign_col    = displayFamilySelector(fieldset, 'benign');

  var fieldset = document.createElement('fieldset');
  form.appendChild(fieldset);
  // Ok and Remove button
  var ok_remove_group = createDivWithClass('', 'form-group col-md-12', fieldset);
  /// Ok button
  var ok_div = createDivWithClass(null, 'col-md-2', ok_remove_group);
  var ok_button = document.createElement('button');
  ok_button.setAttribute('class', 'btn btn-primary');
  ok_button.setAttribute('type', 'button');
  ok_button.setAttribute('id', 'ok_button');
  var ok_button_text = document.createTextNode('Ok');
  ok_button.appendChild(ok_button_text);
  ok_button.addEventListener('click', addLabelCallback(project,
                                                       dataset,
                                                       experiment_id,
                                                       inst_dataset,
                                                       inst_exp_label_id,
                                                       label_iteration));
  ok_div.appendChild(ok_button);
  /// Remove button
  var remove_div = createDivWithClass(null, 'col-md-2 col-md-offset-1', ok_remove_group);
  var button = document.createElement('button');
  button.setAttribute('class', 'btn btn-default');
  button.setAttribute('type', 'button');
  var button_text = document.createTextNode('Remove');
  button.appendChild(button_text);
  button.addEventListener('click', removeLabelCallback(
            project, dataset, experiment_id, inst_dataset, inst_exp_label_id, label_iteration));
  remove_div.appendChild(button);
}

function getCurrentAnnotation(prefix) {
  var label = '';
  var family = '';
  var malicious_selector = $('#' + prefix + '_malicious_family_selector')[0];
  var benign_selector    = $('#' + prefix + '_benign_family_selector')[0];
  if (malicious_selector.selectedIndex != -1) {
      label = 'malicious';
      family = getSelectedOption(malicious_selector);
  } else {
      label = 'benign';
      family = getSelectedOption(benign_selector);
  }
  return [label, family];
}

function addLabelCallback(project, dataset, experiment_id, inst_dataset, inst_exp_label_id, label_iteration) {
  return function() {
    var instance_id     = getCurrentInstance();
    var [label, family] = getCurrentAnnotation('instance');
    if (instance_id) {
      if (!family) {
          alert('A family must be selected.');
          return;
      }
      // Remove previous label
      var query = buildQuery('removeLabel',
                      [project,
                      dataset,
                      experiment_id,
                      inst_dataset,
                      inst_exp_label_id,
                      label_iteration,
                      instance_id]);
      $.ajax({url: query});
      // Add new label
      var query = buildQuery('addLabel',
                      [project,
                      dataset,
                      experiment_id,
                      inst_dataset,
                      inst_exp_label_id,
                      label_iteration,
                      instance_id,
                      label, family,
                      label_method, true]);
      $.ajax({url: query,
              success: function(data) {
                updateInstanceLabel(instance_id);
              }});
      document.getElementById('next_button').focus();
      // Display next instance to annotate
      displayNextInstanceToAnnotate();
    }
  };
}

function removeLabelCallback(project, dataset, experiment_id, inst_dataset, inst_exp_label_id, label_iteration) {
  return function() {
    var instance_id = getCurrentInstance();
    var query = buildQuery('removeLabel',
                    [project,
                    dataset,
                    experiment_id,
                    inst_dataset,
                    inst_exp_label_id,
                    label_iteration,
                    instance_id]);
    $.ajax({url: query,
            success: function(data) {
                updateInstanceLabel(instance_id);
            }});
  }
}

function cleanFeatures() {
  cleanDiv('features');
}

function printFeatures(selected_id) {
    var div_object = cleanDiv('features');
    div_object.style.overflow = 'auto';
    var div_height = Math.round(window.screen.availHeight * 0.4) + 'px';
    div_object.style.height = div_height;
    var query = buildQuery('getFeatures',
                [project, dataset, inst_exp_id, inst_dataset, selected_id]);
    jQuery.getJSON(query, function(data) {
        var ul = document.createElement('ul');
        for (var key in data) {
            var li = document.createElement('li');
            li.appendChild(document.createTextNode(
                            key + ' : ' + data[key]));
            ul.appendChild(li);
        }
        div_object.appendChild(ul);
    });
}

function cleanWeightedFeatures() {
    cleanDiv('weighted_features');
}

function printWeightedFeatures(selected_id) {

    // Display the descriptive statistics of the selected feature
    var callback = function coefficientsCallback(active_bars) {
      var selected_index = active_bars[0]._index;
      var selected_feature = active_bars[0]._view.label;
      var query = buildQuery('getDescriptiveStatsExp',
              [project, inst_dataset, conf.features_filenames]);
      var xmlHttp = new XMLHttpRequest();
      xmlHttp.open('GET', query, false);
      xmlHttp.send(null);
      var stats_exp_id = xmlHttp.responseText;
      var page_query = buildQuery('SecuML',
              [project, inst_dataset, stats_exp_id, selected_feature]);
      window.open(page_query);
    }

    var div_object = cleanDiv('weighted_features');
    var graph_div  = createDiv('instance_graph_div', div_object);
    var query = buildQuery('getTopWeightedFeatures',
                [project, dataset, experiment_id, inst_dataset, inst_exp_id, selected_id, num_coeff]);
    jQuery.getJSON(query, function(data) {
        var tooltip_data = data.tooltip_data;
        var options = barPlotOptions(data);
        barPlotAddTooltips(options, tooltip_data);
        barPlotAddBands(options, true);
        options.legend.display = false;
        var barPlot = drawBarPlot('instance_graph_div', options,
                                  data,
                                  type = 'horizontalBar',
                                  width = null,
                                  height = null,
                                  callback = callback);
        graph_div.style.height = '400px'
    });
}







// Instances Lists
function displayInstancesList(malicious_ok, instances) {
  clearInstancesList(malicious_ok);
  if (instances.length == 0)
      return;
  var instance_selector = $('#instances_selector_' + malicious_ok)[0];
  for (var i in instances) {
    var opt = document.createElement('option');
    opt.text = instances[i];
    instance_selector.add(opt);
  }
}

function createInstancesSelector(malicious_ok) {
  var instances_selector = $('#instances_selector_' + malicious_ok)[0];
  instances_selector.addEventListener('change', function() {
    selected_id = getSelectedOption(instances_selector);
    printInstanceInformation(selected_id);
    last_instance_selector = this;
  }, false);
}

function createInstancesSelectors() {
  createInstancesSelector('ok');
  createInstancesSelector('malicious');
}

function clearInstancesList(malicious_ok) {
    cleanDiv('instances_selector_' + malicious_ok);
}

function clearInstancesLists() {
    clearInstancesList('malicious');
    clearInstancesList('ok');
}
