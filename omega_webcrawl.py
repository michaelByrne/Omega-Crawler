#!/usr/bin/env python

from urllib2 import urlopen
from urllib2 import Request
from urllib2 import HTTPError
from urllib2 import URLError
from urllib import unquote
from re import findall
from re import compile
from re import IGNORECASE
from omega_DS import Stack
from omega_DS import Queue
from omega_DS import Page
from omega_DS import Search
from omega_DS import MyEncoder
from json import dumps
from sys import argv
from sys import exit
import logging

# set logging level debug, info, warning, critial. if want to print debug info, set level = logging.debug
logging.basicConfig(filename="omega_webcrawl_log", level=logging.INFO)

# Diamond variable used to determine if diamonds will be added to return or ignored:
DIAMOND = False;


###########################
# Simple function to return error codes via JSON.  Exits program.
###########################
def error(ID, message):
    error_return = {}
    error_return['Result'] = int(ID)
    error_return['Result_text'] = message
    json_data = dumps(error_return)
    # Output error as JSON for PHP consumption:
    print json_data
    # Log Error as well:
    logging.info("New Invalid Web Crawl Request Output:")
    logging.info(json_data)
    logging.info("")
    # Exit web_crawler:
    exit()


###########################
# Function evaluates command line entry data, and sets up search variables.
###########################
def searchStage(search_data):
    # Check correct # of argv paramaters are passed
    if len(argv) < 5 or len(argv) > 6:
        err_msg = "Invalid # of parameters passed.  Requires 4 or 5, received " + str(len(argv))
        error(1, err_msg)

    # Evaluate and store starting URL.
    try:
        start = (unquote(argv[1]).decode('utf8'))
        # Request workaround for 403 responses found @ http://stackoverflow.com/questions/3336549
        req = Request(start, headers={'User-Agent': "Magic Browser"});
        response = urlopen(req)
        # If raw URL is valid add it directly to search_data
        if response.getcode() == 200:
            search_data.start_url = start
            # if URL is clearly domain only, add a final / to help in duplicate identification.
            if (search_data.start_url.count('/') < 3):
                search_data.start_url += "/";
    except Exception as e:
        # Try with possible schemes if not provided (Note ftp://, h3t://: omitted for simplicity)
        scheme = ["http://", "https://"]
        for x in scheme:
            try:
                req = Request(start, headers={'User-Agent': "Magic Browser"});
                response = urlopen(x + start)
                if response.getcode() == 200:  # If success add scheme + URL to search_data
                    search_data.start_url = x + start
                    # if URL is clearly domain only, add a final / to help in duplicate identification.
                    if (search_data.start_url.count('/') < 3):
                        search_data.start_url += "/";
                    break
            except:
                continue  # If failed, just move on to next scheme.
    # Ensure a valid starting URL was identified, if not return error.
    if search_data.start_url == "":
        error(2, "Invalid Starting URL.")

    # Evaluate and store method of search (Depth vs Bredth First Search)
    if argv[2].upper() == "DF" or argv[2].upper() == "BF":
        search_data.method = argv[2].upper()
    else:
        error(3, "Invalid Method Type, only DF or BF allowed.")

    # Evaluate and store max # of pages to find.  Currently only allows searchs of 25 or fewer.
    if int(argv[3]) < 1 or int(argv[3]) > 50:
        error(4, "Invalid Max # of Pages, between 1 and 25 allowed.")
    else:
        search_data.max_return = int(argv[3])

    # Evaluate and store Terminate keyword if provided.
    if argv[4]:
         search_data.limit = argv[4]

    if len(argv) == 6:
         search_data.term_text = argv[5]

    # Change search list to Stack (currently a Queue) if doing a Depth First search.
    if search_data.method == "DF":
        global searchList
        searchList = Stack()

    # Finally populate the searchList with the first URL to evaluate.
    searchList.push(Page(url=search_data.start_url))

    # DEBUG output of command line data Validation.
    logging.info("\n\nSTARTING NEW WEB CRAWL...................................")
    logging.info("Search Criteria Values:")
    logging.info("Starting URL = " + search_data.start_url)
    logging.info("Method = " + search_data.method)
    logging.info("Max # Pages = " + str(search_data.max_return))
    logging.info("Terimate Word = " + search_data.term_text)


###############End of searchStage()#################



###########################
# Function checks a URL to determine if it has already been evaluated and added to returnList.
# If so, will further check if the connection would make a loop or a diamond, excludes loops,
# will update parents to allow for diamonds.
# Returns True if dup found, False otherwise.
###########################
def dupCheck(returnList, eval_page):
    # Check eval_page for duplication with already evaluated page:
    for x in returnList:
        # eval_page url is already in returnList as evaluated. (Ignores scheme so 'http://URL' == 'https://URL')
        # also ignoring final forward slash so 'www.oregonstate.edu' == 'www.oregonstate.edu/'
        page1 = eval_page.url.split("//", 1)[1]
        page2 = x.url.split("//", 1)[1]
        if page1.endswith('/'):
            page1 = page1[:-1]
        if page2.endswith('/'):
            page2 = page2[:-1]

        # if pages are equal we have found a duplicate page.
        if page1 == page2:
            # DEBUG notification of dup found:
            logging.debug("Found dup - '" + x.url)

            # NOTE: Diamond functionality is complete, but currently not supported by front end Visualization
            # Change Global DIAMOND to true if diamond identification is desired.
            if DIAMOND:
                # Now that dup is found determine if loop or diamond by searching parents up to root:
                parent_tree = Stack()
                parent_tree.push(eval_page.parent[0])  # By default searchList elements have 1 and only 1 parent.
                while (not parent_tree.isEmpty()):
                    node = parent_tree.pop()
                    if node == x.ID:  # Loop identified, exit with no changes to returnList (dup page is a parent of eval)
                        # DEBUG
                        logging.debug("Loop Identified, no changes made to returnList.\n")
                        return True
                    else:  # continue searching the parents to see if dup is a loop.
                        for y in returnList[node].parent:
                            parent_tree.push(y)
                # If parent_tree does not contain dup, then we have a diamond:
                x.parent.append(eval_page.parent[0])  # We add a new parent to the original duped page
                returnList[eval_page.parent[0]].child.append(x.ID)  # Add original dup as child of new parent.

                # DEBUG Notification of succesful Diamond update.
                logging.debug("Diamond Identified, new parent added to:")
                logging.debug(x)
                logging.debug("")
                return True
            else:
                # This simply identifies a dup but ignores the type (if DIAMOND=False), no changes to returnList.
                return True

    # If no duplication is found return False:
    return False


###############End of searchStage()#################



###########################
# Function examines a single URL to find external links, adding any found to searchList.
###########################
def URLEval(searchList, returnList, search_data):
    temp_found = Stack()  # Used to temporarily house links on page, to ensure proper order when using Stack.
    eval_page = searchList.pop()  # Get next page to search from search stack/queue.

    # Check for duplication, if found handled in funciton and no further evaluation required:
    if dupCheck(returnList, eval_page):
        return

    # Execute http request in try loop, and exit function if error on request, or invalid URL.
    try:
        # DEBUG - Print out all attempted URL's to log.
        logging.debug("About to try: " + eval_page.url)

        # Try HTTP connection with URL:
        req = Request(eval_page.url, headers={'User-Agent': "Magic Browser"});
        response = urlopen(req)
    except Exception:
        # DEBUG - Notify of invalid URL in log.
        logging.debug("Invalid, not adding to return.\n")

        # Exit function without having added any new page to return data:
        return

    if response.getcode() == 200:
        # Setup record for addition to returnList
        eval_page.ID = returnList.size()  # Use next available ID value.
        response_html = response.read()
        # following regex finds title, and assigns it to Page() object.
        temp_title = findall('<title[^>]*>([^<]+)</title>', response_html)
        if not temp_title:
            eval_page.title = ""
        else:
            eval_page.title = unquote(temp_title[0]).decode('utf8')
            eval_page.title = eval_page.title.replace("\n", " ")  # Cleanup newlines found on some titles.
            eval_page.title = eval_page.title.replace("\t", " ")  # Cleanup excessive tabs found on some titles.
            eval_page.title = eval_page.title.replace("&nbsp;", " ")  # Cleanup non-breaking Space found on some titles.
            eval_page.title = eval_page.title.replace("&amp;", "&")  # Cleanup HTML encoded &'s found on some titles.
            eval_page.title = eval_page.title.replace("&quot;", "\"")  # Cleanup HTML encoded "'s found on some titles.
            eval_page.title = eval_page.title.replace("&raquo;", "")  # Cleanup HTML encoded >>'s found on some titles.
            eval_page.title = eval_page.title.replace("&#8211;", "")  # Cleanup HTML encoded 's found on some titles.
            eval_page.title = eval_page.title.replace("&#187;", "")  # Cleanup HTML encoded 's found on some titles.
            # Erase leading spaces commonly found in titles.
            while (eval_page.title[0] == " " and len(eval_page.title) > 0):
                eval_page.title = eval_page.title[1:]

        # and push page to returnList as successfully evaluated page.
        returnList.push(eval_page)
        # and add newly pushed page as child in parent's child array.
        if eval_page.parent:  # If page has parents, they need to be updated with new child:
            returnList[eval_page.parent[0]].child.append(eval_page.ID)

        # DEBUGGING OUTPUT:
        logging.debug("Success - Added to return data.")
        logging.debug(eval_page)
        logging.debug("")

        # Check for termination word and end search if found.
        if search_data.term_text != "":
            regobj = compile(r'>[^<]+\b({0})\b'.format(search_data.term_text), flags=IGNORECASE)
            if regobj.search(response_html):
                search_data.terminated = True
                return

        # Identify Base URL of current page before evaluating contained links, this is used for Relative URls.
        base_url = ""
        # URL ends in a '/' then URL is already base URL (http://www.google.com/).
        if eval_page.url[len(eval_page.url) - 1] == "/":
            base_url = eval_page.url
        # URL has only 2 /'s then just needs a final / added (http://www.google.com).
        elif eval_page.url.count('/') < 3:
            base_url = eval_page.url + "/"
        # Otherwise url has 3 or more / and base url is everthing up to final / (http://www.google.com/pics/01.jpg)
        else:
            base_url = eval_page.url.rsplit('/', 1)[0] + "/"
        logging.debug("Base URL of " + base_url + " identified from current url " + eval_page.url)

        # Next go find all external links on this page and add them to the searchList object for future evaluation.
        # following regex looks for any href='' found inside a tag <...href=...>, and returns the URL component.
        # regex logic found @ http://fossbytes.com/how-to-build-a-basic-web-crawler-in-python/
        counter = 0
        for newLink in findall('<a[^>]+href=["\'](.[^"\']+)["\']', response_html):
            logging.debug("Evaluating found href = " + newLink)
            counter += 1
            if counter > int(search_data.limit):
                break


            # Check for inter-page navigation anchors, and ignore if found.
            if len(newLink) > 0 and newLink[0] == "#":
                logging.debug("Ignoring due to Page Anchor.")
                continue


            try:
                # Check for relative URLs and update to absolute URL:
                if newLink[:4].lower() != "http":
                    logging.debug("Identified as relative URL.")
                    # Look for new page in same directory as relative URL (ie href="sitemap.html").
                    if newLink[0] != '/' and newLink[0] != '.':
                        newLink = base_url + newLink;
                        logging.debug("Relative url updated to absolute url - " + newLink)
                    elif newLink[:2] == "./":
                        newLink = base_url + newLink[2:]
                        logging.debug("Relative url updated to absolute url - " + newLink)
                        # Look for new hostname at same Scheme (ie href="//www.youtube.com"):
                    elif newLink[:2] == "//":
                        newLink = base_url.split("//")[0] + "//" + newLink.split("//")[1]
                        logging.debug("Relative url updated to absolute url - " + newLink)
                        # Look for new pathname at same hostname (ie href="/newfolder/index.html"
                    elif newLink[0] == '/':
                        tempArray = base_url.split('/')
                        newLink = '/'.join(tempArray[:3]) + newLink
                        logging.debug("Relative url updated to absolute url - " + newLink)
                        # Look for parent directory calls (ie href="../../../index.html"
                    elif newLink[:2] == "..":
                        up_count = newLink.count("../")
                        dir_count = base_url.count('/') - 3
                        newLink = '/' + newLink.replace("../", "")  # remove the '../'s
                        tempArray = base_url.split('/')  # Breakup base_url by /'s
                        # if there are more "../" then directories go to hostname.
                        if up_count > dir_count:
                            newLink = '/'.join(tempArray[:3]) + newLink  # Find hostname alone.
                            logging.debug("Relative url updated to absolute url - " + newLink)
                            # else if there are fewer "../" then directories move up the right # of directories.
                        else:
                            newLink = '/'.join(tempArray[:(3 + dir_count - up_count)]) + newLink  # Find hostname alone.
                            logging.debug("Relative url updated to absolute url - " + newLink)
                    else:
                        logging.debug("Unable to resolve relative URL = '" + newLink + "', adding as is.")

            # Used to catch some rare exceptions thrown by non Western/Latin languages.
            except Exception:
                logging.debug("Unable to resolve relative URL = '" + newLink + "', adding as is.")

            # Setup new Page() object to add to searchList:
            newPage = Page(url=newLink, parent=returnList.size() - 1)
            logging.debug("External Link - " + newLink + " added to evaluation queue/stack.")
            # Adds newly identified URL to search list.
            if search_data.method == "DF":
                temp_found.push(newPage)
            else:
                searchList.push(newPage)

        # To ensure depth first searches evaluate links in order found, reverse the temp stack into search stack.
        if search_data.method == "DF":
            while (not temp_found.isEmpty()):
                searchList.push(temp_found.pop())

    else:  # Else from response code 200 check.
        # DEBUG - Note 'HTTP response received, but not code 200' to log.
        logging.debug("Response Code != 200, not adding to return.\n")

    return


###############End of URLEval()#################



###########################
# Function adds sibling and visualization required data.
###########################
def visBuild(returnList):
    # Cycle through all return items adding required items for Visualization Algorithm.
    for x in returnList:
        # start by adding all siblings (all children of parent):
        if x.parent:
            for y in returnList[x.parent[0]].child:
                if y != x.ID:  # Make sure not to add self to sibling list.
                    x.sibling.append(y)
        # next add left sibling if exists:
        if x.sibling:
            prev = None
            for y in x.sibling:
                if y < x.ID:
                    x.leftSibling = y
                else:
                    break
            # next add right siibling if exists:
            prev = None
            for y in x.sibling:
                if y < x.ID:
                    continue
                else:
                    x.rightSibling = y
                    break
        # finally add first child if exists:
        if x.child:
            x.firstChild = x.child[0]


###############End of visBuild()#################



###########################
# Function builds and returns JSON response text.
###########################
def resultsGenerate(returnList, search_data):
    # This try loop to check if MyEncoder correctly handles data.
    try:
        # Build JSON formatted object with return details
        return_data = {}
        return_data['Result'] = 0
        return_data['Result_text'] = "Successful Web Crawl"
        return_data['Count'] = returnList.size()
        return_data['Termination'] = search_data.terminated
        return_data['Term_Text'] = search_data.term_text
        return_data['Method'] = search_data.method
        return_data['Requested'] = search_data.max_return
        crawl_results = []
        while (not returnList.isEmpty()):
            crawl_results.append(returnList.pop())
        return_data['Data'] = crawl_results
        json_data = dumps(return_data, cls=MyEncoder)

        # Log Output (either info or debug):
        logging.debug("")
        logging.debug(json_data)
        logging.debug("")
        logging.info("New Web Crawl Request Output:")
        logging.info(json_data)
        logging.info("")

        # Return JSON formatted string
        return json_data

    # This exception triggered for some foreign languages not handled elegantly by UTF8
    except Exception:
        error(10, "Webpage Encountered With Foreign Language Not Supported.  Please Try Another Search.")


###############End of resultsGenerate()#################



###########################
# Start of Main Execution #
###########################
# Declaration of Program Variables
search_data = Search()
returnList = Queue()
searchList = Queue()

# Stage search with command line data
searchStage(search_data)

# Execute Search (cycling through external links until no more links, or max_return # reached)
while (not searchList.isEmpty()) and (returnList.size() < search_data.max_return) and not search_data.terminated:
    URLEval(searchList, returnList, search_data)

# Add visualization data required by front end to data:
visBuild(returnList)

# Print JSON encoded results string for successful crawl to STDOUT for PHP consumption:
print resultsGenerate(returnList, search_data)
###############End of Main Execution#################
