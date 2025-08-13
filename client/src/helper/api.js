export const authHeaders = () => {
    const t = localStorage.getItem('token');   // saved at login
    return t ? { Authorization: `Bearer ${t}` } : {};
};