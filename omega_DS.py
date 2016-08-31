from collections import deque
from json import JSONEncoder


#Quick definition of a simple Stack object
class Stack:
  def __init__(self):
    self.contents = []
  def __getitem__(self, element):
    return self.contents[element]
  
  #Access/Eval Functions:
  def push(self, new_content):
    self.contents.append(new_content)
  def pop(self):
    return self.contents.pop()
  def isEmpty(self):
    if self.contents == []:
      return 1
    else:
      return 0
  def size(self):
    return len(self.contents)
#########End of Stack############



#Quick definition of a simple Queue object
class Queue:
  def __init__(self):
    self.contents = deque([])
  def __getitem__(self, element):
    return self.contents[element]
  
  #Access/Eval Functions:
  def push(self, new_content):
    self.contents.append(new_content)
  def pop(self):
    return self.contents.popleft()
  def isEmpty(self):
    #Logic for checking for empty deque found @ stackoverflow.com/questions/5652278
    if self.contents:
      return 0
    else:
      return 1
  def size(self):
    return len(self.contents)
#########End of Queue############



#Object to house individual page data.
class Page:
  def __init__(self, ID = None, url = "", title = "", child = None, parent = None):
    self._ID = ID 
    self._url = url
    self._title = title
    self._parent = []
    if parent is not None:
      self._parent.append(parent)
    self._child = []
    if child is not None:
      self._child.append(parent)
    self._sibling = []
    self._leftSibling = None
    self._rightSibling = None
    self._firstChild = None
  def __str__(self):
    return 'ID: {0}, URL: {1}, Title: {2}, Parent(s): {3}, Child(ren): {4}'.format(self.ID, self.url, self.title, self.parent, self.child)

  #Property declarations.
  @property
  def ID(self):
    return self._ID
  @property
  def url(self):
    return self._url
  @property
  def title(self):
    return self._title
  @property
  def parent(self):
    return self._parent
  @property
  def child(self):
    return self._child
  @property  
  def sibling(self):
    return self._sibling
  @property
  def leftSibling(self):
    return self._leftSibling
  @property
  def rightSibling(self):
    return self._rightSibling
  @property
  def firstChild(self):
    return self._firstChild
########End of Page###############  



#Object to house user submitted search criteria
class Search:
  def __init__(self, start_url = "", method = "", max_return = None, term_text = "", limit=50):
    self._start_url = start_url
    self._method = method
    self._max_return = max_return
    self._term_text = term_text
    self._terminated = False
    self._limit = limit

  #Property declarations.
  @property
  def start_url(self):
    return self._start_url
  @property
  def method(self):
    return self._method
  @property
  def title(self):
    return self._max_return
  @property
  def term_text(self):
    return self._term_text
  @property
  def limit(self):
    return self._limit
  @property
  def terminated(self):
    return self._terminated


########End of Search###############  



#Handler for list of Page()s encoding
class MyEncoder(JSONEncoder):
  def default(self, o):
    result = {}
    for value in dir(o):
      if not value.startswith('_'):
        result[value] = getattr(o, value)
    return result
########End of MyEncoder###############
