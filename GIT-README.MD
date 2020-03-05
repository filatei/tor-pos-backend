Command line instructions
You can also upload existing files from your computer using the instructions below.


Git global setup
git config --global user.name "Akpodigha Filatei"
git config --global user.email "filatei@gtsng.com"

Create a new repository
git clone git@gitlab.com:torama-mobile/tor-pos-backend.git
cd tor-pos-backend
touch README.md
git add README.md
git commit -m "add README"
git push -u origin master

Push an existing folder
cd existing_folder
git init
git remote add origin git@gitlab.com:torama-mobile/tor-pos-backend.git
git add .
git commit -m "Initial commit"
git push -u origin master

Push an existing Git repository
cd existing_repo
git remote rename origin old-origin
git remote add origin git@gitlab.com:torama-mobile/tor-pos-backend.git
git push -u origin --all
git push -u origin --tags