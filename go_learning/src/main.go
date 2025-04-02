package main

import (
	"fmt"
)

type User struct {
	id   int
	name string
}

type Manager struct {
	User
	title string
}

// 打印User信息
func (user *User) ToString() string {
	return fmt.Sprintf("User: %p, %v\n", user, user)
}

// 打印Manager信息
func (manager *Manager) ToString() string {
	return fmt.Sprintf("Manager: %p, %v\n", manager, manager)
}

func main() {
	m := Manager{User{1, "Tom"}, "Admin"}

	fmt.Println(m.ToString())

	fmt.Println(m.User.ToString())
}
